"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type JobStatus = "queued" | "running" | "done" | "failed";

type PollPayload = {
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

type StatusRecord = {
  id: string;
  text: string;
  at: string;
};

const POLL_MS = 3000;

function jobStatusRecord(status: JobStatus): string {
  if (status === "running") return "任务开始执行，正在生成章节和示例。";
  if (status === "done") return "任务已完成，新版本内容已准备好。";
  if (status === "failed") return "任务执行失败，请查看错误并可重试。";
  return "任务已进入队列，等待处理。";
}

type CoursePendingProps = {
  topicKey: string;
  baselineVersion?: number;
  title?: string;
  initialJob?: PollPayload["job"];
  initialHistory?: PollPayload["history"];
};

export function CoursePending({
  topicKey,
  baselineVersion = 0,
  title = "正在生成教程",
  initialJob = null,
  initialHistory = [],
}: CoursePendingProps) {
  const router = useRouter();
  const latestReadyVersionRef = useRef(baselineVersion);
  const [jobStatus, setJobStatus] = useState<JobStatus>(initialJob?.status ?? "queued");
  const [jobError, setJobError] = useState<string | null>(initialJob?.error ?? null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(initialJob?.updatedAt ?? null);
  const [records, setRecords] = useState<StatusRecord[]>(() =>
    initialHistory.length > 0
      ? initialHistory.slice(0, 8).map((item) => ({
          id: item.id,
          text: item.text,
          at: item.at,
        }))
      : initialJob
      ? [
          {
            id: `${initialJob.id}-${initialJob.status}-${initialJob.updatedAt}`,
            text: jobStatusRecord(initialJob.status),
            at: initialJob.updatedAt,
          },
        ]
      : [],
  );

  const replaceRecords = useCallback((nextRecords: StatusRecord[]) => {
    setRecords((current) => {
      if (
        current.length === nextRecords.length &&
        current.every(
          (item, index) =>
            item.id === nextRecords[index]?.id &&
            item.text === nextRecords[index]?.text &&
            item.at === nextRecords[index]?.at,
        )
      ) {
        return current;
      }
      return nextRecords;
    });
  }, []);

  useEffect(() => {
    latestReadyVersionRef.current = baselineVersion;
  }, [baselineVersion]);

  useEffect(() => {
    let disposed = false;

    async function poll() {
      try {
        const response = await fetch(`/api/topics/${topicKey}/status`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PollPayload;

        if (disposed) {
          return;
        }

        if (payload.job) {
          setJobStatus(payload.job.status);
          setJobError(payload.job.error);
          setLastUpdated(payload.job.updatedAt);
        }

        if (payload.history.length > 0) {
          replaceRecords(
            payload.history.slice(0, 8).map((item) => ({
              id: item.id,
              text: item.text,
              at: item.at,
            })),
          );
        }

        if (payload.course && payload.course.version > latestReadyVersionRef.current) {
          latestReadyVersionRef.current = payload.course.version;
          router.refresh();
        }
      } catch {
        // Keep polling, transient network errors are expected in browser clients.
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);

    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [replaceRecords, router, topicKey]);

  const statusText = useMemo(() => {
    if (jobStatus === "running") {
      if (baselineVersion > 0) {
        return "新版本生成中，当前页面仍展示旧版本内容，可继续阅读。";
      }
      return "教程生成中，正在组装章节与实践示例。";
    }
    if (jobStatus === "failed") return "生成失败，可点击重试。";
    if (jobStatus === "done") return "课程已完成，正在刷新页面。";
    if (baselineVersion > 0) return "刷新任务已排队，正在准备生成最新版本。";
    return "任务已排队，准备开始生成。";
  }, [baselineVersion, jobStatus]);

  async function retry() {
    setJobError(null);

    const response = await fetch("/api/tutorials/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicKey,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "重试失败" }))) as {
        error?: string;
      };
      setJobError(payload.error || "重试失败");
      return;
    }

    const submittedAt = new Date().toISOString();
    setJobStatus("queued");
    setLastUpdated(submittedAt);
    setRecords((current) => [
      {
        id: `retry-submitted-${submittedAt}`,
        text: "已重新提交生成任务。",
        at: submittedAt,
      },
      ...current,
    ].slice(0, 8));
  }

  return (
    <section className="card statusBox">
      <h2>
        <span className="statusPulse" />
        {title}
      </h2>
      <p>{statusText}</p>
      {lastUpdated ? <p className="small">最后状态更新时间：{new Date(lastUpdated).toLocaleString()}</p> : null}
      {records.length > 0 ? (
        <>
          <p className="small">状态记录</p>
          <ul className="statusTimeline">
            {records.map((record) => (
              <li key={record.id}>
                <span>{record.text}</span>
                <span className="small">{new Date(record.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {jobError ? <p className="errorText">错误：{jobError}</p> : null}
      {jobStatus === "failed" ? (
        <button type="button" className="btnGhost" onClick={retry}>
          重新生成
        </button>
      ) : null}
    </section>
  );
}
