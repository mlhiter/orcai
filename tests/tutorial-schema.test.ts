import { describe, expect, it } from "vitest";

import { CourseContentSchema, ensureMinimumModules } from "../lib/tutorial-schema";

function sampleCourse() {
  return {
    title: "样例教程",
    summary: "教程摘要",
    overview: {
      oneLiner: "一句话",
      scope: "范围",
      learningGoals: ["目标一"],
    },
    prerequisites: ["前置"],
    modules: [
      {
        title: "第一章",
        concept: "概念",
        scenario: "场景",
        principle: "原理",
        pitfalls: ["误区"],
        summary: "小结",
      },
    ],
    practiceExamples: [
      {
        title: "实践",
        steps: ["步骤"],
        expectedOutcome: "结果",
      },
    ],
    finalSummary: "总结",
    exercises: ["练习"],
  };
}

describe("course schema", () => {
  it("expands modules to minimum count", () => {
    const content = CourseContentSchema.parse(sampleCourse());
    const expanded = ensureMinimumModules(content, 5);

    expect(expanded.modules).toHaveLength(5);
  });

  it("keeps existing modules when already enough", () => {
    const input = sampleCourse();
    input.modules = [
      ...input.modules,
      {
        title: "第二章",
        concept: "概念",
        scenario: "场景",
        principle: "原理",
        pitfalls: ["误区"],
        summary: "小结",
      },
    ];

    const content = CourseContentSchema.parse(input);
    const expanded = ensureMinimumModules(content, 2);

    expect(expanded.modules).toHaveLength(2);
  });
});
