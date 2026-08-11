import api from './api';

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d?: { price: number[] };
  high_24h: number;
  low_24h: number;
}

export interface MarketOverview {
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
}

export const marketService = {
  getTopCrypto: async (page: number = 1, perPage: number = 50): Promise<Coin[]> => {
    const res = await api.get('/market/crypto', {
      params: { page, perPage, currency: 'usd' },
    });
    return res.data.data?.coins || res.data.data || [];
  },

  getCryptoDetail: async (id: string): Promise<any> => {
    const res = await api.get(`/market/crypto/${id}`);
    return res.data.data;
  },

  getMarketOverview: async (): Promise<MarketOverview> => {
    const res = await api.get('/market/overview');
    return res.data.data;
  },

  getChart: async (id: string, timeframe: string = '1d'): Promise<any> => {
    const res = await api.get(`/market/crypto/${id}/chart`, {
      params: { timeframe },
    });
    return res.data.data;
  },
};
