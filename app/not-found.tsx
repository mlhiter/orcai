import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main>
      <section className="card section">
        <h2>未找到该教程</h2>
        <p>请返回首页输入一个知识点，系统将自动生成或复用教程。</p>
        <Link className="btnGhost" href="/">
          返回首页
        </Link>
      </section>
    </main>
  );
}
