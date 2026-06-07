import client from './client';

export const adminApi = {
  // Users
  listUsers: (params?: object) => client.get('/admin/users', { params }),
  setUserCategory: (id: string, categoria: string) => client.patch(`/admin/users/${id}/category`, { categoria }),
  setUserStatus: (id: string, status: string, email?: string) =>
    client.patch(`/admin/users/${id}/status`, { status, email }),
  verifyPaymentMethod: (userId: string, pmId: string, verificado: boolean) =>
    client.patch(`/admin/users/${userId}/payment-methods/${pmId}/verify`, { verificado }),

  // Auctions
  createAuction: (data: object) => client.post('/admin/auctions', data),
  updateAuction: (id: string, data: object) => client.put(`/admin/auctions/${id}`, data),
  setAuctionStatus: (id: string, status: string) => client.patch(`/admin/auctions/${id}/status`, { status }),
  closeItem: (auctionId: string, itemId: string) =>
    client.patch(`/admin/auctions/${auctionId}/items/${itemId}/close`),
  addItemToAuction: (auctionId: string, itemId: string) =>
    client.post(`/admin/auctions/${auctionId}/items`, { itemId }),

  // Submissions
  listSubmissions: (params?: object) => client.get('/admin/submissions', { params }),
  acceptSubmission: (id: string, data: object) => client.patch(`/admin/submissions/${id}/accept`, data),
  rejectSubmission: (id: string, motivoRechazo: string) =>
    client.patch(`/admin/submissions/${id}/reject`, { motivoRechazo }),

  // Items
  listItems: () => client.get('/admin/items'),
  upsertInsurance: (id: string, data: object) => client.patch(`/admin/items/${id}/insurance`, data),
  upsertLocation: (id: string, data: object) => client.patch(`/admin/items/${id}/location`, data),

  // Purchases
  listPurchases: (params?: object) => client.get('/admin/purchases', { params }),
  applyFine: (id: string) => client.patch(`/admin/purchases/${id}/fine`),
  markPaid: (id: string) => client.patch(`/admin/purchases/${id}/paid`),

  // Auctioneers
  listAuctioneers: () => client.get('/admin/auctioneers'),
  createAuctioneer: (data: object) => client.post('/admin/auctioneers', data),
  updateAuctioneer: (id: string, data: object) => client.put(`/admin/auctioneers/${id}`, data),
};
