import api from './api';

export interface Order {
  id: string;
  reference: string;
  type: string;
  side: string;
  asset: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
  status: string;
  createdAt: string;
}

export interface CreateOrderParams {
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  assetId: string;
  quantity: number;
  price?: number;
  currency: string;
}

export const orderService = {
  createOrder: async (params: CreateOrderParams): Promise<Order> => {
    const res = await api.post('/orders', params);
    return res.data.data;
  },

  getMyOrders: async (page: number = 1, limit: number = 20): Promise<Order[]> => {
    const res = await api.get('/orders', { params: { page, limit } });
    return res.data.data?.orders || res.data.data || [];
  },

  cancelOrder: async (id: string): Promise<any> => {
    const res = await api.delete(`/orders/${id}`);
    return res.data.data;
  },
};
