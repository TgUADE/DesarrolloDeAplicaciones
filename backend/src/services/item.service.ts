import { prisma } from '../config/prisma';
import { fromSiNo, toSiNo } from '../utils/siNo';
import { mapItem, flattenPersonaLite } from '../utils/flatten';

export const itemService = {
  async findById(id: number, includePrice = false) {
    const itemCatalogo = await prisma.itemCatalogo.findUnique({
      where: { identificador: id },
      include: {
        app: true,
        catalogo: { select: { subastaId: true, subasta: { select: { estado: true, app: { select: { currentItemId: true } } } } } },
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
    const mapped = mapItem(itemCatalogo, { includePrice }) as any;
    // ¿Este ítem es el que se está subastando ahora? (subasta abierta + currentItemId == este)
    const subasta = itemCatalogo.catalogo?.subasta;
    mapped.auctionStatus = subasta?.estado ?? null;
    mapped.isCurrent = subasta?.estado === 'abierta' && subasta?.app?.currentItemId === itemCatalogo.identificador;
    return mapped;
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
    const nroPoliza = data.nroPoliza?.trim();
    const compania = data.compania?.trim();
    if (!nroPoliza) throw { status: 400, message: 'El número de póliza es obligatorio' };
    if (!compania) throw { status: 400, message: 'La compañía es obligatoria' };
    if (!Number.isFinite(data.importe) || data.importe <= 0) throw { status: 400, message: 'El importe asegurado debe ser mayor a cero' };

    const producto = await prisma.producto.findUnique({
      where: { identificador: productoId },
      select: { identificador: true, duenioId: true },
    });
    if (!producto) throw { status: 404, message: 'Producto no encontrado' };

    const existing = await prisma.seguro.findUnique({
      where: { nroPoliza },
      include: { app: true, productos: { select: { identificador: true, duenioId: true } } },
    });
    if (existing?.app && existing.app.duenioId !== producto.duenioId) {
      throw { status: 400, message: 'La póliza ya pertenece a otro dueño' };
    }
    if (existing?.productos.some((p) => p.duenioId !== producto.duenioId)) {
      throw { status: 400, message: 'La póliza cubre piezas de otro dueño' };
    }

    const willBeCombined = data.polizaCombinada ?? Boolean(existing && existing.productos.some((p) => p.identificador !== productoId));
    const polizaCombinada = toSiNo(willBeCombined);
    const seguro = await prisma.$transaction(async (tx) => {
      const saved = await tx.seguro.upsert({
        where: { nroPoliza },
        create: { nroPoliza, compania, importe: data.importe, polizaCombinada },
        update: { compania, importe: data.importe, polizaCombinada },
      });
      await tx.seguroApp.upsert({
        where: { nroPoliza },
        create: { nroPoliza, duenioId: producto.duenioId },
        update: { duenioId: producto.duenioId },
      });
      await tx.producto.update({ where: { identificador: productoId }, data: { nroPoliza } });
      return saved;
    });
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
export async function ensureSeguro(productoId: number, baseValue: number, duenioId: number, compania = 'La Subastadora Seguros S.A.') {
  // Una póliza por dueño: todos los productos del mismo dueño comparten la misma póliza.
  const nroPoliza = `POL-DUENIO-${duenioId}`;
  const importeNuevo = Math.max(1, Math.round(Number(baseValue)));

  const existing = await prisma.seguro.findUnique({ where: { nroPoliza } });
  if (existing) {
    await prisma.seguro.update({
      where: { nroPoliza },
      data: {
        importe: Number(existing.importe) + importeNuevo,
        compania,
        polizaCombinada: 'si',
      },
    });
  } else {
    await prisma.seguro.create({
      data: { nroPoliza, compania, importe: importeNuevo, polizaCombinada: 'no' },
    });
  }

  // Vincula la póliza con su dueño en la tabla de extensión (idempotente).
  await prisma.seguroApp.upsert({
    where: { nroPoliza },
    create: { nroPoliza, duenioId },
    update: { duenioId },
  });

  await prisma.producto.update({ where: { identificador: productoId }, data: { nroPoliza } });
  return nroPoliza;
}
