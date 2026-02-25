import type { CourseContent } from "@/lib/tutorial-schema";

export function CourseView({ content }: { content: CourseContent }) {
  return (
    <>
      <section className="card section">
        <span className="badge">结构化教程</span>
        <h2>{content.title}</h2>
        <p>{content.summary}</p>
        <h3>概览</h3>
        <p>{content.overview.oneLiner}</p>
        <p className="small">适用范围：{content.overview.scope}</p>
        <h3>学习目标</h3>
        <ul>
          {content.overview.learningGoals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section className="card section">
        <h3>前置知识</h3>
        <ul>
          {content.prerequisites.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card section">
        <h3>章节结构</h3>
        <div className="moduleGrid">
          {content.modules.map((moduleItem) => (
            <article className="moduleCard" key={moduleItem.title}>
              <h4>{moduleItem.title}</h4>
              <p>
                <strong>概念：</strong>
                {moduleItem.concept}
              </p>
              <p>
                <strong>场景：</strong>
                {moduleItem.scenario}
              </p>
              <p>
                <strong>原理：</strong>
                {moduleItem.principle}
              </p>
              <p>
                <strong>误区：</strong>
              </p>
              <ul>
                {moduleItem.pitfalls.map((pitfall) => (
                  <li key={pitfall}>{pitfall}</li>
                ))}
              </ul>
              <p>
                <strong>小结：</strong>
                {moduleItem.summary}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card section">
        <h3>实践示例</h3>
        {content.practiceExamples.map((example) => (
          <article key={example.title}>
            <h4>{example.title}</h4>
            <ol>
              {example.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>
              <strong>预期结果：</strong>
              {example.expectedOutcome}
            </p>
          </article>
        ))}
      </section>

      <section className="card section">
        <h3>总结</h3>
        <p>{content.finalSummary}</p>
        <h3>练习</h3>
        <ul>
          {content.exercises.map((exercise) => (
            <li key={exercise}>{exercise}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
