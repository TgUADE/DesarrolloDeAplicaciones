/**
 * Límites de puja (replica de backend/src/utils/bidLimits.ts).
 * - Mínimo: última oferta + 1% del precio base.
 * - Máximo: última oferta + 20% del precio base.
 * - Oro/Platino no tienen tope máximo; el mínimo de 1% igual aplica.
 */
const CATEGORIES_WITHOUT_MAX_BID = ['oro', 'platino'];

export function calcMinBid(precioBase: number, ultimaOferta: number, categoria: string): number {
  return ultimaOferta + precioBase * 0.01;
}

export function calcMaxBid(precioBase: number, ultimaOferta: number, categoria: string): number | null {
  if (CATEGORIES_WITHOUT_MAX_BID.includes(categoria)) return null;
  return ultimaOferta + precioBase * 0.2;
}
