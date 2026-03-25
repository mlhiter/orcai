import { beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/topics/:topicKey/status", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns topic status when topic exists", async () => {
    const getTopicStatus = vi.fn().mockResolvedValue({
      topicKey: "topic-key-1",
      job: {
        id: "job-1",
        status: "running",
        error: null,
        updatedAt: new Date("2026-03-25T10:00:00.000Z").toISOString(),
      },
      course: null,
      history: [],
    });

    vi.doMock("@/lib/generation", () => ({
      getTopicStatus,
    }));

    const { GET } = await import("../app/api/topics/[topicKey]/status/route");
    const response = await GET(new Request("http://localhost/api/topics/topic-key-1/status"), {
      params: Promise.resolve({ topicKey: "topic-key-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      topicKey: "topic-key-1",
      job: {
        id: "job-1",
        status: "running",
        error: null,
        updatedAt: "2026-03-25T10:00:00.000Z",
      },
      course: null,
      history: [],
    });
  });

  it("returns 404 when topic is missing", async () => {
    const getTopicStatus = vi.fn().mockResolvedValue(null);

    vi.doMock("@/lib/generation", () => ({
      getTopicStatus,
    }));

    const { GET } = await import("../app/api/topics/[topicKey]/status/route");
    const response = await GET(new Request("http://localhost/api/topics/missing/status"), {
      params: Promise.resolve({ topicKey: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "topic not found",
    });
  });
});
