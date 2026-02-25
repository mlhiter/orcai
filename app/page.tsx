import Link from "next/link";

import { TopicForm } from "@/components/topic-form";

export default function HomePage() {
  return (
    <main>
      <section className="card hero">
        <h1>把任何知识点变成可复用的结构化教程</h1>
        <p>
          输入一个知识点，系统会优先复用历史教程；若无命中则触发 Web 搜索与大模型生成，输出章节化学习内容。
        </p>
      </section>

      <TopicForm />

      <section className="card section">
        <h3>当前 MVP 能力</h3>
        <ul>
          <li>单知识点输入，生成结构化教程</li>
          <li>同知识点命中后直接复用已有版本</li>
          <li>支持手动刷新，生成新版本教程</li>
        </ul>
        <p className="small">
          如果你已经有 `topicKey`，可直接访问教程页：
          <Link href="/courses/demo-topic"> /courses/&lt;topicKey&gt;</Link>
        </p>
      </section>
    </main>
  );
}
