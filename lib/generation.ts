import { JobStatus, Prisma } from "@prisma/client";

import { generateStructuredCourse } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { searchAndCollectEvidence } from "@/lib/search";
import { buildTopicKey, normalizeTopic } from "@/lib/topic";

export type GeneratePayload = {
  query: string;
  lang?: "zh" | "en";
  forceRefresh?: boolean;
};

export type GenerateResponse =
  | {
      hit: "reuse";
      topicKey: string;
      courseId: string;
      version: number;
    }
  | {
      hit: "miss";
      topicKey: string;
      jobId: string;
    };

export type TopicStatusSnapshot = {
  topicKey: string;
  job: {
    id: string;
    status: JobStatus;
    error: string | null;
    updatedAt: string;
  } | null;
  course: {
    id: string;
    version: number;
    title: string;
    updatedAt: string;
  } | null;
  history: Array<{
    id: string;
    jobId: string;
    status: JobStatus;
    text: string;
    at: string;
  }>;
};

type JobHistorySeed = {
  id: string;
  status: JobStatus;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedAt: Date;
};

function buildTopicHistory(seeds: JobHistorySeed[]): TopicStatusSnapshot["history"] {
  const events: TopicStatusSnapshot["history"] = [];

  for (const seed of seeds) {
    events.push({
      id: `${seed.id}-queued-${seed.createdAt.getTime()}`,
      jobId: seed.id,
      status: "queued",
      text: "任务已创建并进入队列。",
      at: seed.createdAt.toISOString(),
    });

    if (seed.startedAt) {
      events.push({
        id: `${seed.id}-running-${seed.startedAt.getTime()}`,
        jobId: seed.id,
        status: "running",
        text: "任务开始执行，正在生成内容。",
        at: seed.startedAt.toISOString(),
      });
    } else if (seed.status === "running") {
      events.push({
        id: `${seed.id}-running-${seed.updatedAt.getTime()}`,
        jobId: seed.id,
        status: "running",
        text: "任务开始执行，正在生成内容。",
        at: seed.updatedAt.toISOString(),
      });
    }

    if (seed.status === "done") {
      const doneAt = seed.finishedAt ?? seed.updatedAt;
      events.push({
        id: `${seed.id}-done-${doneAt.getTime()}`,
        jobId: seed.id,
        status: "done",
        text: "任务已完成，新版本课程已生成。",
        at: doneAt.toISOString(),
      });
    }

    if (seed.status === "failed") {
      const failedAt = seed.finishedAt ?? seed.updatedAt;
      events.push({
        id: `${seed.id}-failed-${failedAt.getTime()}`,
        jobId: seed.id,
        status: "failed",
        text: seed.error ? `任务失败：${seed.error}` : "任务执行失败。",
        at: failedAt.toISOString(),
      });
    }
  }

  events.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  return events.slice(0, 16);
}

function parseMinModules(): number {
  const raw = Number(process.env.MIN_MODULES);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.floor(raw);
}

function modelConfigJson(): Prisma.InputJsonValue {
  return {
    provider: process.env.OPENAI_API_KEY ? "openai" : "fallback",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    minModules: parseMinModules(),
    searchProvider: process.env.TAVILY_API_KEY ? "tavily" : "duckduckgo",
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "unknown_error";
}

function startJobAsync(jobId: string): void {
  setTimeout(() => {
    processGenerationJob(jobId).catch((error) => {
      console.error("processGenerationJob failed", error);
    });
  }, 0);
}

export async function generateOrReuse(payload: GeneratePayload): Promise<GenerateResponse> {
  const query = payload.query.trim();
  if (!query) {
    throw new Error("query cannot be empty");
  }

  const lang = payload.lang ?? "zh";
  const normalizedQuery = normalizeTopic(query);
  if (!normalizedQuery) {
    throw new Error("query cannot be normalized to an empty value");
  }

  const topicKey = buildTopicKey(normalizedQuery, lang);

  const result = await prisma.$transaction(async (tx) => {
    let topic = await tx.topic.findUnique({
      where: {
        normalizedQuery_lang: {
          normalizedQuery,
          lang,
        },
      },
    });

    if (!topic) {
      topic = await tx.topic.create({
        data: {
          rawQuery: query,
          normalizedQuery,
          lang,
          topicKey,
        },
      });
    }

    const latestReadyCourse = await tx.course.findFirst({
      where: {
        topicId: topic.id,
        status: "ready",
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
      },
    });

    if (latestReadyCourse && !payload.forceRefresh) {
      return {
        hit: "reuse" as const,
        topicKey: topic.topicKey,
        courseId: latestReadyCourse.id,
        version: latestReadyCourse.version,
      };
    }

    const activeJob = await tx.generationJob.findFirst({
      where: {
        topicId: topic.id,
        status: {
          in: ["queued", "running"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (activeJob) {
      return {
        hit: "miss" as const,
        topicKey: topic.topicKey,
        jobId: activeJob.id,
      };
    }

    const job = await tx.generationJob.create({
      data: {
        topicId: topic.id,
        status: "queued",
        modelConfigJson: modelConfigJson(),
      },
      select: {
        id: true,
      },
    });

    return {
      hit: "miss" as const,
      topicKey: topic.topicKey,
      jobId: job.id,
    };
  });

  if (result.hit === "miss") {
    startJobAsync(result.jobId);
  }

  return result;
}

export async function refreshTopic(topicKey: string): Promise<{ jobId: string }> {
  const topic = await prisma.topic.findUnique({
    where: {
      topicKey,
    },
    select: {
      id: true,
    },
  });

  if (!topic) {
    throw new Error("topic not found");
  }

  const job = await prisma.generationJob.create({
    data: {
      topicId: topic.id,
      status: "queued",
      modelConfigJson: modelConfigJson(),
    },
    select: {
      id: true,
    },
  });

  startJobAsync(job.id);
  return { jobId: job.id };
}

export async function getTopicStatus(topicKey: string): Promise<TopicStatusSnapshot | null> {
  const topic = await prisma.topic.findUnique({
    where: {
      topicKey,
    },
    select: {
      id: true,
      topicKey: true,
    },
  });

  if (!topic) {
    return null;
  }

  const [job, course, jobs] = await Promise.all([
    prisma.generationJob.findFirst({
      where: {
        topicId: topic.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        error: true,
        updatedAt: true,
      },
    }),
    prisma.course.findFirst({
      where: {
        topicId: topic.id,
        status: "ready",
      },
      orderBy: {
        version: "desc",
      },
      select: {
        id: true,
        version: true,
        title: true,
        updatedAt: true,
      },
    }),
    prisma.generationJob.findMany({
      where: {
        topicId: topic.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        status: true,
        error: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (job?.status === "queued") {
    startJobAsync(job.id);
  }

  return {
    topicKey,
    job: job
      ? {
          id: job.id,
          status: job.status,
          error: job.error,
          updatedAt: job.updatedAt.toISOString(),
        }
      : null,
    course: course
      ? {
          id: course.id,
          version: course.version,
          title: course.title,
          updatedAt: course.updatedAt.toISOString(),
        }
      : null,
    history: buildTopicHistory(jobs),
  };
}

export async function getCourseSnapshot(topicKey: string) {
  const topic = await prisma.topic.findUnique({
    where: {
      topicKey,
    },
    select: {
      id: true,
      rawQuery: true,
      topicKey: true,
      lang: true,
    },
  });

  if (!topic) {
    return null;
  }

  const [course, job] = await Promise.all([
    prisma.course.findFirst({
      where: {
        topicId: topic.id,
        status: "ready",
      },
      orderBy: {
        version: "desc",
      },
    }),
    prisma.generationJob.findFirst({
      where: {
        topicId: topic.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        error: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    topic,
    course,
    job,
  };
}

export async function processGenerationJob(jobId: string): Promise<void> {
  const claimed = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      status: "queued",
    },
    data: {
      status: "running",
      startedAt: new Date(),
      attempt: {
        increment: 1,
      },
    },
  });

  if (claimed.count === 0) {
    return;
  }

  const job = await prisma.generationJob.findUnique({
    where: {
      id: jobId,
    },
    include: {
      topic: true,
    },
  });

  if (!job) {
    return;
  }

  try {
    const minModules = parseMinModules();
    const evidence = await searchAndCollectEvidence(job.topic.rawQuery);

    if (evidence.length > 0) {
      await prisma.searchEvidence.createMany({
        data: evidence.map((item) => ({
          jobId: job.id,
          url: item.url,
          title: item.title,
          snippet: item.snippet,
          qualityScore: item.qualityScore,
        })),
        skipDuplicates: true,
      });
    }

    const content = await generateStructuredCourse({
      query: job.topic.rawQuery,
      evidence,
      minModules,
    });

    const latestCourse = await prisma.course.findFirst({
      where: {
        topicId: job.topicId,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        version: true,
      },
    });

    const version = (latestCourse?.version ?? 0) + 1;

    const course = await prisma.course.create({
      data: {
        topicId: job.topicId,
        title: content.title,
        summary: content.summary,
        status: "ready",
        version,
        contentJson: content as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    await prisma.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "done",
        courseId: course.id,
        finishedAt: new Date(),
        error: null,
      },
    });
  } catch (error) {
    await prisma.generationJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: formatError(error),
      },
    });
  }
}
