export type Evidence = {
  url: string;
  title: string;
  snippet: string;
  qualityScore: number;
};

type TavilyResponse = {
  results?: Array<{
    url?: string;
    title?: string;
    content?: string;
    score?: number;
  }>;
};

type DuckDuckGoTopic = {
  FirstURL?: string;
  Text?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  AbstractURL?: string;
  Heading?: string;
  AbstractText?: string;
  RelatedTopics?: DuckDuckGoTopic[];
};

function parseLimit(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function scoreUrl(url: string): number {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith(".edu") || hostname.endsWith(".gov")) return 0.95;
    if (hostname.includes("wikipedia.org")) return 0.9;
    if (hostname.includes("developer.") || hostname.includes("docs.")) return 0.86;
    if (hostname.includes("github.com")) return 0.8;
    return 0.7;
  } catch {
    return 0.5;
  }
}

function flattenTopics(topics: DuckDuckGoTopic[], acc: DuckDuckGoTopic[] = []): DuckDuckGoTopic[] {
  for (const topic of topics) {
    if (topic.Topics && topic.Topics.length > 0) {
      flattenTopics(topic.Topics, acc);
      continue;
    }
    acc.push(topic);
  }
  return acc;
}

async function searchWithTavily(query: string, limit: number): Promise<Evidence[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: limit,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  const data = (await response.json()) as TavilyResponse;
  const rows = data.results ?? [];

  return rows
    .filter((row): row is Required<Pick<typeof row, "url" | "title" | "content">> & typeof row => {
      return Boolean(row.url && row.title && row.content);
    })
    .slice(0, limit)
    .map((row) => ({
      url: row.url,
      title: row.title,
      snippet: row.content.slice(0, 280),
      qualityScore: typeof row.score === "number" ? Math.max(0, Math.min(1, row.score)) : scoreUrl(row.url),
    }));
}

async function searchWithDuckDuckGo(query: string, limit: number): Promise<Evidence[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed: ${response.status}`);
  }

  const data = (await response.json()) as DuckDuckGoResponse;
  const topics = flattenTopics(data.RelatedTopics ?? []);

  const rows: Evidence[] = [];

  if (data.AbstractURL && data.AbstractText) {
    rows.push({
      url: data.AbstractURL,
      title: data.Heading ?? query,
      snippet: data.AbstractText,
      qualityScore: scoreUrl(data.AbstractURL),
    });
  }

  for (const item of topics) {
    if (!item.FirstURL || !item.Text) continue;
    rows.push({
      url: item.FirstURL,
      title: item.Text.split(" - ")[0] ?? query,
      snippet: item.Text,
      qualityScore: scoreUrl(item.FirstURL),
    });
    if (rows.length >= limit) break;
  }

  return rows.slice(0, limit);
}

export async function searchAndCollectEvidence(query: string): Promise<Evidence[]> {
  const limit = parseLimit(process.env.SEARCH_RESULT_LIMIT, 6);
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  if (process.env.TAVILY_API_KEY) {
    const fromTavily = await searchWithTavily(trimmed, limit);
    if (fromTavily.length > 0) {
      return fromTavily;
    }
  }

  return searchWithDuckDuckGo(trimmed, limit);
}
