const UNLIMITED = ['oro', 'platino'];

export function calcMinBid(precioBase: number, ultimaOferta: number, categoria: string): number {
  if (UNLIMITED.includes(categoria)) return ultimaOferta + 0.01;
  return ultimaOferta + precioBase * 0.01;
}

export function calcMaxBid(precioBase: number, ultimaOferta: number, categoria: string): number | null {
  if (UNLIMITED.includes(categoria)) return null;
  return ultimaOferta + precioBase * 0.2;
}
