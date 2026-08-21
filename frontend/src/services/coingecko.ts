/* ============================================================
   COMPATIBILIDAD — re-exporta el servicio de mercado real.
   (Antes contenía fallback a datos mock; ya no.)
   ============================================================ */
import { marketService, getTimeframeDays, type MarketCoin, type OHLCPoint } from "./market";

export { marketService as default, marketService, getTimeframeDays, type MarketCoin, type OHLCPoint };

/* Aliases usados por páginas existentes */
export const getTopCryptos = marketService.getTopCryptos.bind(marketService);
export const getOHLC = marketService.getOHLC.bind(marketService);
export const getCoinDetail = marketService.getCoinDetail.bind(marketService);
