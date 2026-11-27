import api, { unwrap } from "../api/client";

export type NewsCategory = "all" | "crypto" | "forex" | "stocks" | "macro";

export interface TradingNewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
  image: string;
}

export interface TradingNewsFeed {
  query: string;
  category: NewsCategory;
  source: string;
  items: TradingNewsItem[];
  cached: boolean;
}

export interface NewsImpact {
  sentiment: "alcista" | "bajista" | "neutral";
  assets: string[];
  impactSummary: string;
}

export const newsService = {
  async search(query?: string, category: NewsCategory = "all", signal?: AbortSignal): Promise<TradingNewsFeed> {
    const params = new URLSearchParams();
    if (query?.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    const suffix = params.size ? `?${params.toString()}` : "";
    const res = await api.get(`/news${suffix}`, { signal });
    return unwrap<TradingNewsFeed>(res.data);
  },

  async analyze(title: string, snippet: string, signal?: AbortSignal): Promise<NewsImpact> {
    const res = await api.post("/news/analyze", { title, snippet }, { signal, timeout: 30_000 });
    return unwrap<NewsImpact>(res.data);
  },
};
