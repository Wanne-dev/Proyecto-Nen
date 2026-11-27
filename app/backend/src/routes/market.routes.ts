import { Router, type Response } from "express";
import { getSpotBook, getSpotCandles, getSpotQuotes, isMarketAsset, isMarketRange } from "../services/kraken-market";
import type { MarketSnapshot } from "../services/market-feed";

const router = Router();

function send<T>(res: Response, snapshot: MarketSnapshot<T>) {
  // Solo el servidor conoce la antigüedad real del dato; no conservar respuestas en el navegador.
  res.set("Cache-Control", "no-store").json(snapshot);
}

router.get("/quotes", async (_req, res) => { send(res, await getSpotQuotes()); });
router.get("/candles/:asset", async (req, res) => {
  const { asset } = req.params;
  const range = req.query.range ?? "24h";
  if (!isMarketAsset(asset) || !isMarketRange(range)) {
    res.status(400).json({ message: "Par o rango de mercado no admitido" }); return;
  }
  send(res, await getSpotCandles(asset, range));
});
router.get("/book/:asset", async (req, res) => {
  const { asset } = req.params;
  if (!isMarketAsset(asset)) { res.status(400).json({ message: "Par de mercado no admitido" }); return; }
  send(res, await getSpotBook(asset));
});

export default router;
