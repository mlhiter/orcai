import { createHash } from "node:crypto";

const NON_WORD = /[^\p{L}\p{N}\s-]/gu;

export function normalizeTopic(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(NON_WORD, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTopicKey(normalizedQuery: string, lang: string): string {
  return createHash("sha256")
    .update(`${lang}:${normalizedQuery}`)
    .digest("hex")
    .slice(0, 18);
}
