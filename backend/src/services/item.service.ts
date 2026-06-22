import { prisma } from '../config/prisma';
import { fromSiNo, toSiNo } from '../utils/siNo';
import { mapItem, flattenPersonaLite } from '../utils/flatten';

export const itemService = {
  async findById(id: number, includePrice = false) {
    const itemCatalogo = await prisma.itemCatalogo.findUnique({
      where: { identificador: id },
      include: {
        app: true,
        catalogo: { select: { subastaId: true } },
        producto: {
          include: {
            app: true,
            fotos: { orderBy: { app: { orden: 'asc' } }, include: { app: true } },
            duenio: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } },
          },
        },
      },
    });
    if (!itemCatalogo) return null;
    return mapItem(itemCatalogo, { includePrice });
  },

  async getBids(itemCatalogoId: number) {
    const bids = await prisma.pujo.findMany({
      where: { itemId: itemCatalogoId, app: { confirmada: true } },
      include: {
        app: true,
        asistente: {
          include: { cliente: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } } },
        },
      },
      orderBy: { app: { createdAt: 'desc' } },
    });
    const mejorOferta = bids.length > 0 ? bids[0].importe : null;
    const mapped = bids.map((b) => ({
      id: b.identificador,
      monto: b.importe,
      moneda: b.app?.moneda ?? 'ARS',
      createdAt: b.app?.createdAt ?? null,
      user: flattenPersonaLite(b.asistente.cliente.persona),
    }));
    return { bids: mapped, mejorOferta };
  },

  async getLocation(productoId: number) {
    const p = await prisma.producto.findUnique({
      where: { identificador: productoId },
      select: { identificador: true, descripcionCompleta: true, app: { select: { status: true, deposito: true, ubicacion: true } } },
    });
    if (!p) return null;
    return {
      identificador: p.identificador,
      descripcionCompleta: p.descripcionCompleta,
      status: p.app?.status ?? null,
      deposito: p.app?.deposito ?? null,
      ubicacion: p.app?.ubicacion ?? null,
    };
  },

  async getInsurance(productoId: number) {
    const producto = await prisma.producto.findUnique({
      where: { identificador: productoId },
      include: { seguro: true },
    });
    const seguro = producto?.seguro;
    return seguro ? { ...seguro, polizaCombinada: fromSiNo(seguro.polizaCombinada) } : null;
  },

  async upsertInsurance(
    productoId: number,
    data: { nroPoliza: string; compania: string; importe: number; polizaCombinada?: boolean },
  ) {
    const polizaCombinada = toSiNo(data.polizaCombinada);
    const seguro = await prisma.seguro.upsert({
      where: { nroPoliza: data.nroPoliza },
      create: { nroPoliza: data.nroPoliza, compania: data.compania, importe: data.importe, polizaCombinada },
      update: { compania: data.compania, importe: data.importe, polizaCombinada },
    });
    await prisma.producto.update({ where: { identificador: productoId }, data: { nroPoliza: data.nroPoliza } });
    return { ...seguro, polizaCombinada: fromSiNo(seguro.polizaCombinada) };
  },

  async upsertLocation(productoId: number, data: { deposito?: string; ubicacion?: string }) {
    await prisma.productoApp.update({
      where: { productoId },
      data: { deposito: data.deposito, ubicacion: data.ubicacion },
    });
    return { productoId, deposito: data.deposito ?? null, ubicacion: data.ubicacion ?? null };
  },
};

/**
 * Crea (o actualiza) la póliza de seguro de un producto en función de su valor base
 * y la asocia al producto (`nroPoliza`). Pobla la tabla legacy `seguros`.
 * La consigna: a cada bien recibido se le contrata un seguro según el valor base.
 */
export async function ensureSeguro(productoId: number, baseValue: number, compania = 'La Subastadora Seguros S.A.') {
  const nroPoliza = `POL-${productoId}`;
  const importe = Math.max(1, Math.round(Number(baseValue)));
  await prisma.seguro.upsert({
    where: { nroPoliza },
    create: { nroPoliza, compania, importe, polizaCombinada: 'no' },
    update: { importe, compania },
  });
  await prisma.producto.update({ where: { identificador: productoId }, data: { nroPoliza } });
  return nroPoliza;
}
