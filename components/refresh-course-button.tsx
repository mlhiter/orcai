"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshCourseButton({ topicKey }: { topicKey: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshCourse() {
    setPending(true);
    setError(null);

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
      {error ? <p className="errorText">{error}</p> : null}
    </div>
  );
}
