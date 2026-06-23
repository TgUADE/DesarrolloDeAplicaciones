import client from '@/api/client';
import type { Auction } from '@/api/auctions';

export interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  domicilioLegal: string | null;
  paisNacimiento: string | null;
  categoria: string;
  cuentaCobro: string | null;
}

/** GET /api/users/:id → datos de perfil del usuario. */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await client.get(`/users/${userId}`);
  return res.data.data as UserProfile;
}

export interface ProfileChangeRequest {
  id: string;
  nombre: string | null;
  apellido: string | null;
  domicilioLegal: string | null;
  cuentaCobro: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivoRechazo: string | null;
  createdAt: string;
}

/**
 * POST /api/users/:id/profile-change-requests → SOLICITA actualizar los datos.
 * Los cambios NO se aplican hasta que la empresa (admin) los aprueba.
 */
export async function requestProfileChange(
  userId: string,
  data: { nombre: string; apellido: string; domicilioLegal: string; cuentaCobro: string },
): Promise<ProfileChangeRequest> {
  const res = await client.post(`/users/${userId}/profile-change-requests`, data);
  return res.data.data as ProfileChangeRequest;
}

/** GET /api/users/:id/profile-change-requests → solicitudes del usuario (la última primero). */
export async function getProfileChangeRequests(userId: string): Promise<ProfileChangeRequest[]> {
  const res = await client.get(`/users/${userId}/profile-change-requests`);
  return res.data.data.requests as ProfileChangeRequest[];
}

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
