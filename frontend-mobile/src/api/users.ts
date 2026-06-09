import client from '@/api/client';
import type { Auction } from '@/api/auctions';

/** GET /api/users/:id/auction-history → subastas en las que participó el usuario. */
export async function getAuctionHistory(userId: string): Promise<Auction[]> {
  const res = await client.get(`/users/${userId}/auction-history`);
  return res.data.data.auctions as Auction[];
}
