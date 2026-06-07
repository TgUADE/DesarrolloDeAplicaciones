import { AuctionCategory } from '@prisma/client';

const UNLIMITED_CATEGORIES: AuctionCategory[] = ['oro', 'platino'];

export function calcMinBid(precioBase: number, ultimaOferta: number, categoria: AuctionCategory): number {
  if (UNLIMITED_CATEGORIES.includes(categoria)) return ultimaOferta + 0.01;
  return ultimaOferta + precioBase * 0.01;
}

export function calcMaxBid(precioBase: number, ultimaOferta: number, categoria: AuctionCategory): number | null {
  if (UNLIMITED_CATEGORIES.includes(categoria)) return null;
  return ultimaOferta + precioBase * 0.2;
}

export function validateBidAmount(
  monto: number,
  precioBase: number,
  ultimaOferta: number,
  categoria: AuctionCategory
): { valid: boolean; error?: string; min: number; max: number | null } {
  const min = calcMinBid(precioBase, ultimaOferta, categoria);
  const max = calcMaxBid(precioBase, ultimaOferta, categoria);

  if (monto < min) {
    return { valid: false, error: `La puja mínima es ${min}`, min, max };
  }
  if (max !== null && monto > max) {
    return { valid: false, error: `La puja máxima es ${max}`, min, max };
  }
  return { valid: true, min, max };
}
