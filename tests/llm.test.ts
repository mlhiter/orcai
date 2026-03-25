import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateStructuredCourse } from "../lib/llm";

const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("llm fallback content", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
      return;
    }

    delete process.env.OPENAI_API_KEY;
  });

  it("attaches module references from evidence in fallback mode", async () => {
    const course = await generateStructuredCourse({
      query: "Kubernetes 调度机制",
      minModules: 5,
      evidence: [
        {
          title: "Kubernetes Scheduling",
          url: "https://kubernetes.io/docs/concepts/scheduling-eviction/",
          snippet: "Scheduling overview from official docs.",
          qualityScore: 0.95,
        },
        {
          title: "Scheduler framework",
          url: "https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/",
          snippet: "Framework extension points.",
          qualityScore: 0.9,
        },
      ],
    });

    expect(course.modules).toHaveLength(5);
    expect(course.modules[0]?.references.length).toBeGreaterThan(0);
    expect(course.modules[0]?.references[0]?.url).toBe(
      "https://kubernetes.io/docs/concepts/scheduling-eviction/",
    );
  });

  it("keeps empty references when no evidence is available", async () => {
    const course = await generateStructuredCourse({
      query: "事件循环",
      minModules: 5,
      evidence: [],
    });

    expect(course.modules).toHaveLength(5);
    expect(course.modules.every((moduleItem) => moduleItem.references.length === 0)).toBe(true);
  });
});
