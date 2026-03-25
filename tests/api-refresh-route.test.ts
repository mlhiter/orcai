import { beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/tutorials/refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns active or new job id for valid requests", async () => {
    const refreshTopic = vi.fn().mockResolvedValue({
      jobId: "job-1",
      reused: true,
    });

    vi.doMock("@/lib/generation", () => ({
      refreshTopic,
    }));

    const { POST } = await import("../app/api/tutorials/refresh/route");
    const response = await POST(
      new Request("http://localhost/api/tutorials/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicKey: "topic-key-1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobId: "job-1",
      reused: true,
    });
  });

  it("maps missing topics to 404", async () => {
    const refreshTopic = vi.fn().mockRejectedValue(new Error("topic not found"));

    vi.doMock("@/lib/generation", () => ({
      refreshTopic,
    }));

    const { POST } = await import("../app/api/tutorials/refresh/route");
    const response = await POST(
      new Request("http://localhost/api/tutorials/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicKey: "missing",
        }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "topic not found",
    });
  });
});
