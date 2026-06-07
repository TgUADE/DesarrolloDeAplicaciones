import client from './client';

export const auctionApi = {
  list: (params?: object) => client.get('/auctions', { params }),
  getById: (id: string) => client.get(`/auctions/${id}`),
  getCatalog: (id: string) => client.get(`/auctions/${id}/catalog`),
  getCurrentItem: (id: string) => client.get(`/auctions/${id}/current-item`),
  getBids: (id: string, params?: object) => client.get(`/auctions/${id}/bids`, { params }),
  getParticipants: (id: string) => client.get(`/auctions/${id}/participants`),
  join: (id: string) => client.post(`/auctions/${id}/join`),
  leave: (id: string) => client.delete(`/auctions/${id}/leave`),
  placeBid: (id: string, data: { monto: number; paymentMethodId: string }) =>
    client.post(`/auctions/${id}/bids`, data),
};
