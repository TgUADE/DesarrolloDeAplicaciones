import client from './client';

export const userApi = {
  getById: (id: string) => client.get(`/users/${id}`),
  update: (id: string, data: object) => client.put(`/users/${id}`, data),
  getMetrics: (id: string) => client.get(`/users/${id}/metrics`),
  getMessages: (id: string, params?: object) => client.get(`/users/${id}/messages`, { params }),
  markMessageRead: (id: string, msgId: string) => client.put(`/users/${id}/messages/${msgId}/read`),
  getAuctionHistory: (id: string, params?: object) => client.get(`/users/${id}/auction-history`, { params }),
  getPurchases: (id: string, params?: object) => client.get(`/users/${id}/purchases`, { params }),
  getSubmissions: (id: string, params?: object) => client.get(`/users/${id}/submissions`, { params }),
  getPaymentMethods: (id: string) => client.get(`/users/${id}/payment-methods`),
  addPaymentMethod: (id: string, data: object) => client.post(`/users/${id}/payment-methods`, data),
  updatePaymentMethod: (id: string, pmId: string, data: object) => client.put(`/users/${id}/payment-methods/${pmId}`, data),
  deletePaymentMethod: (id: string, pmId: string) => client.delete(`/users/${id}/payment-methods/${pmId}`),
};
