import { z } from "zod";

export const ModuleReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().min(1),
});

export const ModuleSchema = z.object({
  title: z.string().min(1),
  concept: z.string().min(1),
  scenario: z.string().min(1),
  principle: z.string().min(1),
  pitfalls: z.array(z.string().min(1)).min(1),
  summary: z.string().min(1),
  references: z.array(ModuleReferenceSchema).default([]),
});

export const PracticeExampleSchema = z.object({
  title: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  expectedOutcome: z.string().min(1),
});

export const CourseContentSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  overview: z.object({
    oneLiner: z.string().min(1),
    scope: z.string().min(1),
    learningGoals: z.array(z.string().min(1)).min(1),
  }),
  prerequisites: z.array(z.string().min(1)).min(1),
  modules: z.array(ModuleSchema).min(1),
  practiceExamples: z.array(PracticeExampleSchema).min(1),
  finalSummary: z.string().min(1),
  exercises: z.array(z.string().min(1)).min(1),
});

export type CourseContent = z.infer<typeof CourseContentSchema>;

function fillerModule(topic: string, index: number) {
  const n = index + 1;

  return {
    title: `${topic} 进阶章节 ${n}`,
    concept: `补充 ${topic} 的关键概念，形成完整认知闭环。`,
    scenario: `在真实学习路径中，通常会在第 ${n} 阶段遇到该问题。`,
    principle: `通过分层抽象和案例对比，掌握该章节对应的核心原理。`,
    pitfalls: ["忽略边界条件", "只记结论不理解推导过程"],
    summary: `本章补足了 ${topic} 在系统学习中的关键环节。`,
    references: [],
  };
}

export function ensureMinimumModules(content: CourseContent, minModules: number): CourseContent {
  if (content.modules.length >= minModules) {
    return content;
  }

  const nextModules = [...content.modules];
  for (let i = nextModules.length; i < minModules; i += 1) {
    nextModules.push(fillerModule(content.title, i));
  }

  return {
    ...content,
    modules: nextModules,
  };
}
