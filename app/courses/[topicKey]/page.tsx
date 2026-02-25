import Link from "next/link";
import { notFound } from "next/navigation";

import { CoursePending } from "@/components/course-pending";
import { CourseView } from "@/components/course-view";
import { RefreshCourseButton } from "@/components/refresh-course-button";
import { getCourseSnapshot } from "@/lib/generation";
import { CourseContentSchema } from "@/lib/tutorial-schema";

type CoursePageProps = {
  params: Promise<{ topicKey: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { topicKey } = await params;
  const snapshot = await getCourseSnapshot(topicKey);

  if (!snapshot) {
    notFound();
  }

  return (
    <main>
      <div className="toolbar">
        <Link className="btnGhost" href="/">
          返回首页
        </Link>
        <RefreshCourseButton topicKey={topicKey} />
      </div>

      <section className="card section">
        <span className="badge">知识点</span>
        <h2>{snapshot.topic.rawQuery}</h2>
        <p className="small">TopicKey: {snapshot.topic.topicKey}</p>
      </section>

      {snapshot.course ? (
        (() => {
          const parsed = CourseContentSchema.safeParse(snapshot.course.contentJson);
          if (!parsed.success) {
            return (
              <section className="card section">
                <h3>课程数据校验失败</h3>
                <p className="errorText">{parsed.error.issues[0]?.message ?? "未知错误"}</p>
              </section>
            );
          }

          return <CourseView content={parsed.data} />;
        })()
      ) : (
        <CoursePending topicKey={topicKey} />
      )}
    </main>
  );
}
