/**
 * Límites de puja (replica de backend/src/utils/bidLimits.ts).
 * - Mínimo: última oferta + 1% del precio base.
 * - Máximo: última oferta + 20% del precio base.
 * - Oro/Platino no tienen tope (mínimo: última oferta + 0.01).
 */
const UNLIMITED = ['oro', 'platino'];

export function calcMinBid(precioBase: number, ultimaOferta: number, categoria: string): number {
  if (UNLIMITED.includes(categoria)) return ultimaOferta + 0.01;
  return ultimaOferta + precioBase * 0.01;
}

export function calcMaxBid(precioBase: number, ultimaOferta: number, categoria: string): number | null {
  if (UNLIMITED.includes(categoria)) return null;
  return ultimaOferta + precioBase * 0.2;
}
