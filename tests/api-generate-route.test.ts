import { beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/tutorials/generate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns generation result when payload is valid", async () => {
    const generateOrReuse = vi.fn().mockResolvedValue({
      hit: "reuse",
      topicKey: "topic-key-1",
      courseId: "course-1",
      version: 1,
    });

    vi.doMock("@/lib/generation", () => ({
      generateOrReuse,
    }));

    const { POST } = await import("../app/api/tutorials/generate/route");
    const response = await POST(
      new Request("http://localhost/api/tutorials/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "Kubernetes 调度机制",
          lang: "zh",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      hit: "reuse",
      topicKey: "topic-key-1",
      courseId: "course-1",
      version: 1,
    });
    expect(generateOrReuse).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when payload is invalid", async () => {
    vi.doMock("@/lib/generation", () => ({
      generateOrReuse: vi.fn(),
    }));

    const { POST } = await import("../app/api/tutorials/generate/route");
    const response = await POST(
      new Request("http://localhost/api/tutorials/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
