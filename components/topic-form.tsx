"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GenerateResponse = {
  hit: "reuse" | "miss";
  topicKey: string;
  jobId?: string;
};

export function TopicForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!query.trim()) {
      setError("请输入一个知识点。\n例如：Kubernetes 调度机制");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/tutorials/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          lang: "zh",
        }),
      });

      const payload = (await response.json()) as GenerateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "提交失败");
      }

      router.push(`/courses/${payload.topicKey}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "请求失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="card inputCard" onSubmit={handleSubmit}>
      <label htmlFor="topic">输入你要学习的知识点</label>
      <textarea
        id="topic"
        name="topic"
        rows={4}
        placeholder="例如：事件循环 / 分布式一致性 / Kubernetes 调度 / 哈希表"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button className="btnPrimary" type="submit" disabled={isLoading}>
        {isLoading ? "正在提交..." : "生成结构化教程"}
      </button>
      <p className="small">系统会优先复用已存在教程；若无命中将创建新生成任务。</p>
      {error ? <p className="errorText">{error}</p> : null}
    </form>
  );
}
