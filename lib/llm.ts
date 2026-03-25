import { CourseContentSchema, ensureMinimumModules, type CourseContent } from "@/lib/tutorial-schema";
import type { Evidence } from "@/lib/search";

type GenerateInput = {
  query: string;
  evidence: Evidence[];
  minModules: number;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type ModuleReference = CourseContent["modules"][number]["references"][number];

function buildResponsesUrl(): string {
  const configured = process.env.OPENAI_BASE_URL?.trim();
  const baseUrl = configured && configured.length > 0 ? configured : "https://api.openai.com/v1";
  const sanitized = baseUrl.replace(/\/+$/, "");

  if (/\/responses$/i.test(sanitized)) {
    return sanitized;
  }

  return `${sanitized}/responses`;
}

function extractModelOutput(response: OpenAIResponse): string {
  if (response.output_text && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    for (const block of item.content ?? []) {
      if (block.type === "output_text" && block.text) {
        chunks.push(block.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function toModuleReference(item: Evidence): ModuleReference {
  return {
    title: item.title,
    url: item.url,
    snippet: item.snippet || item.title,
  };
}

function pickModuleReferences(evidence: Evidence[], moduleIndex: number): ModuleReference[] {
  if (evidence.length === 0) return [];

  const count = Math.min(3, evidence.length);
  return Array.from({ length: count }).map((_, offset) => {
    const index = (moduleIndex + offset) % evidence.length;
    return toModuleReference(evidence[index]);
  });
}

function fallbackContent(query: string, evidence: Evidence[], minModules: number): CourseContent {
  const evidenceSummary = evidence.slice(0, 3).map((item) => item.title);
  const modules = Array.from({ length: minModules }).map((_, idx) => ({
    title: `${query} 第 ${idx + 1} 章`,
    concept: `解释 ${query} 的第 ${idx + 1} 个关键概念。`,
    scenario: `给出 ${query} 在真实场景中的典型应用。`,
    principle: `拆解该场景背后的原理和决策逻辑。`,
    pitfalls: ["只记定义不做验证", "忽略上下文与边界条件"],
    summary: `完成本章后，你应当能复述并应用该章节知识。`,
    references: pickModuleReferences(evidence, idx),
  }));

  return {
    title: `${query} 结构化教程`,
    summary: `围绕 ${query} 的系统化学习教程，包含概念、场景、原理和实践。`,
    overview: {
      oneLiner: `${query} 是一个可通过分层学习掌握的知识主题。`,
      scope: "本教程聚焦核心原理、常见实践路径与高频误区。",
      learningGoals: [
        `理解 ${query} 的核心定义与边界`,
        `能在典型问题中应用 ${query}`,
        "建立可复用的学习与实践框架",
      ],
    },
    prerequisites: ["基础计算机概念", "阅读技术文档能力", "最小实践环境"],
    modules,
    practiceExamples: [
      {
        title: `${query} 最小实践`,
        steps: [
          "准备一个最小实验环境",
          "按章节完成关键步骤并记录现象",
          "对照原理解释每个现象并总结改进点",
        ],
        expectedOutcome: `你可以独立完成一次 ${query} 的最小可执行实践。`,
      },
    ],
    finalSummary: `通过分章节学习与实践，你已经建立了 ${query} 的整体认知框架。`,
    exercises: [
      "用自己的话解释该主题的关键术语",
      "列出三个真实场景并说明适用边界",
      evidenceSummary.length > 0
        ? `对比资料中的不同观点：${evidenceSummary.join(" / ")}`
        : "复盘一次实践并写出改进建议",
    ],
  };
}

async function generateWithOpenAI(input: GenerateInput): Promise<CourseContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const responsesUrl = buildResponsesUrl();

  if (!apiKey) {
    return fallbackContent(input.query, input.evidence, input.minModules);
  }

  const evidenceText =
    input.evidence.length > 0
      ? input.evidence
          .map(
            (item, idx) =>
              `${idx + 1}. 标题: ${item.title}\nURL: ${item.url}\n摘要: ${item.snippet}\n可信分: ${item.qualityScore.toFixed(2)}`,
          )
          .join("\n\n")
      : "无外部检索证据，请在生成中明确基于通用知识组织内容。";

  const systemPrompt = [
    "你是教程架构师。",
    "任务：基于用户知识点生成结构化教程 JSON。",
    "必须满足：",
    "1) 输出合法 JSON，不要输出额外说明。",
    "2) modules 数量至少为给定下限。",
    "3) 每章包含 concept/scenario/principle/pitfalls/summary。",
    "4) 内容应可学习、可执行，避免空泛。",
    "5) 使用简体中文输出。",
    "6) 每章包含 references 数组，元素为 title/url/snippet；无法给出来源时返回空数组。",
  ].join("\n");

  const userPrompt = [
    `知识点: ${input.query}`,
    `最小章节数: ${input.minModules}`,
    "可用证据:",
    evidenceText,
    "请严格输出以下 JSON 结构:",
    `{
  "title": "string",
  "summary": "string",
  "overview": {
    "oneLiner": "string",
    "scope": "string",
    "learningGoals": ["string"]
  },
  "prerequisites": ["string"],
  "modules": [
    {
      "title": "string",
      "concept": "string",
      "scenario": "string",
      "principle": "string",
      "pitfalls": ["string"],
      "summary": "string",
      "references": [
        {
          "title": "string",
          "url": "https://example.com",
          "snippet": "string"
        }
      ]
    }
  ],
  "practiceExamples": [
    {
      "title": "string",
      "steps": ["string"],
      "expectedOutcome": "string"
    }
  ],
  "finalSummary": "string",
  "exercises": ["string"]
}`,
  ].join("\n\n");

  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} (${responsesUrl})`);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const rawText = extractModelOutput(payload);
  const jsonText = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Invalid JSON from model: ${(error as Error).message}`);
  }

  const validated = CourseContentSchema.parse(parsed);
  return ensureMinimumModules(validated, input.minModules);
}

export async function generateStructuredCourse(input: GenerateInput): Promise<CourseContent> {
  const raw = await generateWithOpenAI(input);
  const validated = CourseContentSchema.parse(raw);
  return ensureMinimumModules(validated, input.minModules);
}
