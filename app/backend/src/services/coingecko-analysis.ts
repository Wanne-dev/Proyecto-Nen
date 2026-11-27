import { marketFeed, publicJson } from "./market-feed";

const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d";
export const getAnalysisInput = marketFeed("CoinGecko", 120_000, 300_000, 300_000, async (_: "usd") => {
  const response = await publicJson(url);
  return response && Array.isArray(response.data) && response.data.length ? { at: response.at, data: response.data as unknown[] } : null;
});
