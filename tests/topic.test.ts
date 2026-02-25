import { describe, expect, it } from "vitest";

import { buildTopicKey, normalizeTopic } from "../lib/topic";

describe("topic normalization", () => {
  it("normalizes punctuation and whitespace", () => {
    const value = normalizeTopic("  Kubernetes   调度机制!!! ");
    expect(value).toBe("kubernetes 调度机制");
  });

  it("builds deterministic topic keys", () => {
    const normalized = normalizeTopic("Event Loop");
    const first = buildTopicKey(normalized, "zh");
    const second = buildTopicKey(normalized, "zh");

    expect(first).toBe(second);
    expect(first).toHaveLength(18);
  });
});
