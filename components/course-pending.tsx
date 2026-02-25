"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PollPayload = {
  topicKey: string;
  job: {
    id: string;
    status: "queued" | "running" | "done" | "failed";
    error: string | null;
    updatedAt: string;
  } | null;
  course: {
    id: string;
    version: number;
    title: string;
    updatedAt: string;
  } | null;
};

const POLL_MS = 3000;

export function CoursePending({ topicKey }: { topicKey: string }) {
  const router = useRouter();
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [jobError, setJobError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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

        if (payload.course) {
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
  }, [router, topicKey]);

  const statusText = useMemo(() => {
    if (jobStatus === "running") return "教程生成中，正在组装章节与实践示例。";
    if (jobStatus === "failed") return "生成失败，可点击重试。";
    if (jobStatus === "done") return "课程已完成，正在刷新页面。";
    return "任务已排队，准备开始生成。";
  }, [jobStatus]);

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

    setJobStatus("queued");
  }

  return (
    <section className="card statusBox">
      <h2>
        <span className="statusPulse" />
        正在生成教程
      </h2>
      <p>{statusText}</p>
      {lastUpdated ? <p className="small">最后状态更新时间：{new Date(lastUpdated).toLocaleString()}</p> : null}
      {jobError ? <p className="errorText">错误：{jobError}</p> : null}
      {jobStatus === "failed" ? (
        <button type="button" className="btnGhost" onClick={retry}>
          重新生成
        </button>
      ) : null}
    </section>
  );
}
