"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StatusPayload = {
  job: {
    status: "queued" | "running" | "done" | "failed";
  } | null;
};

export function RefreshCourseButton({ topicKey }: { topicKey: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) {
      return;
    }

    let disposed = false;

    async function syncSubmittedState() {
      try {
        const response = await fetch(`/api/topics/${topicKey}/status`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as StatusPayload;
        if (disposed) {
          return;
        }

        const active = payload.job ? payload.job.status === "queued" || payload.job.status === "running" : false;
        if (!active) {
          setSubmitted(false);
        }
      } catch {
        // Ignore transient client-side fetch failures.
      }
    }

    syncSubmittedState();
    const timer = setInterval(syncSubmittedState, 3000);

    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [submitted, topicKey]);

  async function refreshCourse() {
    setPending(true);
    setError(null);
    setSubmitted(false);

    try {
      const response = await fetch("/api/tutorials/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topicKey }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "刷新失败");
      }

      setSubmitted(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "刷新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button className="btnGhost" type="button" onClick={refreshCourse} disabled={pending}>
        {pending ? "正在创建刷新任务..." : "重新生成最新版本"}
      </button>
      {submitted ? <p className="small">刷新任务已提交，状态卡会持续显示最新进度。</p> : null}
      {error ? <p className="errorText">{error}</p> : null}
    </div>
  );
}
