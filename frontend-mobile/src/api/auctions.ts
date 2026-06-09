import client from '@/api/client';

export type AuctionStatus = 'programada' | 'abierta' | 'cerrada' | 'finalizada';
export type AuctionCategory = 'comun' | 'especial' | 'plata' | 'oro' | 'platino';
export type Currency = 'ARS' | 'USD';

export interface Rematador {
  id: string;
  nombre: string;
  apellido: string;
}

export interface Auction {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaHora: string;
  ubicacion: string;
  categoria: AuctionCategory;
  moneda: Currency;
  status: AuctionStatus;
  esColeccion: boolean;
  nombreColeccion: string | null;
  currentItemId: string | null;
  rematador?: Rematador;
  _count?: { items: number; participants: number };
  /** Primer ítem (con su primera imagen) para usar como portada. */
  items?: { id: string; images?: { url: string }[] }[];
}

export interface ItemImage {
  id: string;
  url: string;
  orden: number;
}

export interface Item {
  id: string;
  numeroPieza: string;
  descripcion: string;
  /** Decimal serializado como string; solo presente para usuarios autenticados. */
  precioBase?: string;
  status: string;
  auctionId?: string | null;
  esObraDeArte: boolean;
  artista: string | null;
  fechaObra: string | null;
  historia: string | null;
  cantidadElementos: number;
  descripcionElementos: string | null;
  images: ItemImage[];
  currentOwner?: { id: string; nombre: string; apellido: string };
}

export interface ListAuctionsParams {
  status?: AuctionStatus;
  categoria?: AuctionCategory;
  moneda?: Currency;
  page?: number;
  limit?: number;
}

/** GET /api/auctions → lista de subastas (con rematador y conteos). */
export async function listAuctions(params: ListAuctionsParams = {}): Promise<Auction[]> {
  const res = await client.get('/auctions', { params });
  return res.data.data.auctions as Auction[];
}

/** GET /api/auctions/:id → detalle de una subasta. */
export async function getAuction(id: string): Promise<Auction> {
  const res = await client.get(`/auctions/${id}`);
  return res.data.data as Auction;
}

/** GET /api/auctions/:id/catalog → ítems de la subasta (con precio si hay sesión). */
export async function getCatalog(auctionId: string): Promise<Item[]> {
  const res = await client.get(`/auctions/${auctionId}/catalog`);
  return res.data.data.items as Item[];
}

/** GET /api/items/:id → detalle de una pieza. */
export async function getItem(id: string): Promise<Item> {
  const res = await client.get(`/items/${id}`);
  return res.data.data as Item;
}

export interface Bid {
  id: string;
  monto: string;
  moneda: Currency;
  createdAt: string;
  userId?: string;
  user?: { id: string; nombre: string; apellido: string };
}

export interface CurrentItem {
  item: Item | null;
  mejorOferta: string | null;
  mejorPostor: { id: string; nombre: string; apellido: string } | null;
}

/** GET /api/auctions/:id/current-item → ítem en remate + mejor oferta.
 * El back devuelve `null` cuando la subasta no tiene pieza activa; normalizamos. */
export async function getCurrentItem(auctionId: string): Promise<CurrentItem> {
  const res = await client.get(`/auctions/${auctionId}/current-item`);
  const data = res.data.data as CurrentItem | null;
  return data ?? { item: null, mejorOferta: null, mejorPostor: null };
}

/** GET /api/auctions/:id/bids → historial de pujas del ítem actual. */
export async function getAuctionBids(auctionId: string): Promise<Bid[]> {
  const res = await client.get(`/auctions/${auctionId}/bids`);
  return res.data.data.bids as Bid[];
}

/** POST /api/auctions/:id/join → unirse a la subasta (valida categoría/estado). */
export async function joinAuction(auctionId: string): Promise<{ canBid: boolean }> {
  const res = await client.post(`/auctions/${auctionId}/join`);
  return res.data.data as { canBid: boolean };
}

/** DELETE /api/auctions/:id/leave → abandonar la subasta. */
export async function leaveAuction(auctionId: string): Promise<void> {
  await client.delete(`/auctions/${auctionId}/leave`);
}

/** POST /api/auctions/:id/bids → pujar. */
export async function placeBid(
  auctionId: string,
  monto: number,
  paymentMethodId: string,
): Promise<{ puja: Bid; mejorOferta: number }> {
  const res = await client.post(`/auctions/${auctionId}/bids`, { monto, paymentMethodId });
  return res.data.data as { puja: Bid; mejorOferta: number };
}
