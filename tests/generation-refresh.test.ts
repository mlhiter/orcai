import { beforeEach, describe, expect, it, vi } from "vitest";

type MockTx = {
  topic: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  generationJob: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function mockPrismaWithTransaction(tx: MockTx) {
  return {
    $transaction: vi.fn(async (callback: (input: MockTx) => Promise<unknown>) => callback(tx)),
  };
}

describe("refreshTopic", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reuses active jobs instead of creating duplicate refresh jobs", async () => {
    const tx: MockTx = {
      topic: {
        findUnique: vi.fn().mockResolvedValue({ id: "topic-1" }),
      },
      generationJob: {
        findFirst: vi.fn().mockResolvedValue({ id: "job-active-1" }),
        create: vi.fn(),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      prisma: mockPrismaWithTransaction(tx),
    }));

    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    const { refreshTopic } = await import("../lib/generation");

    const result = await refreshTopic("topic-key-1");

    expect(result).toEqual({
      jobId: "job-active-1",
      reused: true,
    });
    expect(tx.generationJob.create).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("creates a new queued job when there is no active refresh job", async () => {
    const tx: MockTx = {
      topic: {
        findUnique: vi.fn().mockResolvedValue({ id: "topic-1" }),
      },
      generationJob: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "job-new-1" }),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      prisma: mockPrismaWithTransaction(tx),
    }));

    const setTimeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation(() => 0 as unknown as NodeJS.Timeout);
    const { refreshTopic } = await import("../lib/generation");

    const result = await refreshTopic("topic-key-1");

    expect(result).toEqual({
      jobId: "job-new-1",
      reused: false,
    });
    expect(tx.generationJob.create).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });

  it("throws when topic key does not exist", async () => {
    const tx: MockTx = {
      topic: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      generationJob: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      prisma: mockPrismaWithTransaction(tx),
    }));

    const { refreshTopic } = await import("../lib/generation");

    await expect(refreshTopic("missing-topic")).rejects.toThrow("topic not found");
    expect(tx.generationJob.findFirst).not.toHaveBeenCalled();
    expect(tx.generationJob.create).not.toHaveBeenCalled();
  });
});
