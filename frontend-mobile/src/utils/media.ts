import { HOST } from '@/constants/config';

/**
 * Resuelve la URL de una imagen del back.
 * - Si ya es absoluta (http/https) la devuelve tal cual.
 * - Si es relativa (ej. "/uploads/x.jpg") le antepone el host del backend.
 */
export function imageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${HOST}${path.startsWith('/') ? '' : '/'}${path}`;
}
