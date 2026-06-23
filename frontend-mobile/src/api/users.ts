import client from '@/api/client';
import type { Auction } from '@/api/auctions';

/** GET /api/users/:id/auction-history → subastas en las que participó el usuario. */
export async function getAuctionHistory(userId: string): Promise<Auction[]> {
  const res = await client.get(`/users/${userId}/auction-history`);
  return res.data.data.auctions as Auction[];
}

/** GET /api/users/:id/my-auctions → favoritas + participadas (con flags followed/participating). */
export async function getMyAuctions(userId: string): Promise<Auction[]> {
  const res = await client.get(`/users/${userId}/my-auctions`);
  return res.data.data.auctions as Auction[];
}

export interface MyProduct {
  identificador: number;
  numeroPieza?: string;
  descripcionCompleta?: string;
  status?: string;
  disponible?: boolean;
  deposito?: string | null;
  ubicacion?: string | null;
  seguro?: { nroPoliza: string; compania: string; importe: string } | null;
  images?: { url: string | null }[];
}

/** GET /api/users/:id/products → piezas de las que el usuario es DUEÑO (depósito + póliza). */
export async function listMyProducts(userId: string): Promise<MyProduct[]> {
  const res = await client.get(`/users/${userId}/products`);
  return res.data.data.products as MyProduct[];
}

export interface InsuredPiece {
  identificador: number;
  descripcionCompleta: string;
  numeroPieza: string | null;
  status: string | null;
  moneda: string | null;
}

export interface PendingInsuranceRequest {
  id: string;
  valorSolicitado: number;
  diferenciaPremio: number;
  createdAt: string;
}

export interface MyInsurance {
  nroPoliza: string;
  compania: string;
  importe: number;
  polizaCombinada: boolean;
  premioEstimado: number;
  solicitudPendiente: PendingInsuranceRequest | null;
  productos: InsuredPiece[];
}

/** GET /api/users/:id/insurances → pólizas de las que el usuario es beneficiario (dueño). */
export async function listMyInsurances(userId: string): Promise<MyInsurance[]> {
  const res = await client.get(`/users/${userId}/insurances`);
  return res.data.data.seguros as MyInsurance[];
}

export interface IncreaseRequestResult {
  id: string;
  nroPoliza: string;
  valorActual: number;
  valorSolicitado: number;
  diferenciaPremio: number;
  estado: string;
}

/** POST /api/users/:id/insurances/:nroPoliza/increase-request → solicita aumentar el valor
 *  asegurado. NO cambia el importe: crea una solicitud que la empresa debe aprobar. */
export async function requestInsuranceIncrease(userId: string, nroPoliza: string, nuevoValor: number): Promise<IncreaseRequestResult> {
  const res = await client.post(`/users/${userId}/insurances/${encodeURIComponent(nroPoliza)}/increase-request`, { nuevoValor });
  return res.data.data as IncreaseRequestResult;
}
