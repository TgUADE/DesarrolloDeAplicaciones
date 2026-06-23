import { prisma } from '../config/prisma';
import { getPagination } from '../utils/pagination';
import { subastaInclude, mapSubasta } from './auction.service';
import { flattenProducto } from '../utils/flatten';
import { fromSiNo } from '../utils/siNo';
import { Request } from 'express';

export const userService = {
  async findById(id: number) {
    const persona = await prisma.persona.findUnique({
      where: { identificador: id },
      include: { cliente: true, app: true },
    });
    if (!persona) return null;
    return {
      id: persona.identificador.toString(),
      nombre: persona.nombre,
      apellido: persona.app?.apellido ?? '',
      email: persona.app?.email ?? null,
      direccion: persona.direccion,
      domicilioLegal: persona.direccion ?? null,
      paisNacimiento: persona.app?.paisOrigen ?? null,
      cuentaCobro: persona.app?.cuentaCobro ?? null,
      categoria: persona.cliente?.categoria ?? 'comun',
      status: persona.app?.registrationStatus ?? 'pendiente',
      isAdmin: persona.app?.isAdmin ?? false,
      createdAt: persona.app?.createdAt ?? null,
      updatedAt: persona.app?.updatedAt ?? null,
    };
  },

  /**
   * Actualiza los datos editables del perfil. NO se pueden modificar email,
   * país de nacimiento ni categoría (se ignoran si vienen en el body).
   */
  async update(id: number, data: { nombre?: string; apellido?: string; domicilioLegal?: string; cuentaCobro?: string }) {
    const personaData: Record<string, unknown> = {};
    if (data.nombre?.trim()) personaData.nombre = data.nombre.trim();
    if (data.domicilioLegal !== undefined) personaData.direccion = data.domicilioLegal.trim() || null;

    const appData: Record<string, unknown> = {};
    if (data.apellido?.trim()) appData.apellido = data.apellido.trim();
    if (data.cuentaCobro !== undefined) appData.cuentaCobro = data.cuentaCobro.trim() || null;

    await prisma.persona.update({
      where: { identificador: id },
      data: { ...personaData, ...(Object.keys(appData).length ? { app: { update: appData } } : {}) },
    });
    return userService.findById(id);
  },

  async getMetrics(personaId: number) {
    const [participaciones, victorias, pujos] = await Promise.all([
      prisma.asistente.count({ where: { clienteId: personaId } }),
      prisma.registroDeSubasta.count({ where: { clienteId: personaId, app: { status: 'pagado' } } }),
      prisma.pujo.findMany({
        where: { asistente: { clienteId: personaId }, app: { confirmada: true } },
        select: { importe: true, app: { select: { moneda: true } } },
      }),
    ]);

    const registros = await prisma.registroDeSubasta.findMany({
      where: { clienteId: personaId },
      select: { importe: true, comision: true, app: { select: { moneda: true } } },
    });

    const totalPagadoARS = registros
      .filter((r) => r.app?.moneda === 'ARS')
      .reduce((s, r) => s + Number(r.importe) + Number(r.comision), 0);
    const totalPagadoUSD = registros
      .filter((r) => r.app?.moneda === 'USD')
      .reduce((s, r) => s + Number(r.importe) + Number(r.comision), 0);
    const totalOfertadoARS = pujos.filter((b) => b.app?.moneda === 'ARS').reduce((s, b) => s + Number(b.importe), 0);
    const totalOfertadoUSD = pujos.filter((b) => b.app?.moneda === 'USD').reduce((s, b) => s + Number(b.importe), 0);

    return { totalParticipaciones: participaciones, totalVictorias: victorias, totalPagadoARS, totalPagadoUSD, totalOfertadoARS, totalOfertadoUSD };
  },

  async getAuctionHistory(personaId: number, req: Request) {
    const { skip, limit, page } = getPagination(req);
    const [asistentes, total] = await Promise.all([
      prisma.asistente.findMany({
        where: { clienteId: personaId },
        skip,
        take: limit,
        include: { subasta: { include: subastaInclude } },
        orderBy: { app: { joinedAt: 'desc' } },
      }),
      prisma.asistente.count({ where: { clienteId: personaId } }),
    ]);
    return { auctions: asistentes.map((a) => mapSubasta(a.subasta)), total, page };
  },

  async getMyAuctions(personaId: number) {
    const [favorites, participations] = await Promise.all([
      prisma.auctionFavorite.findMany({
        where: { clienteId: personaId },
        include: { subasta: { include: subastaInclude } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asistente.findMany({
        where: { clienteId: personaId },
        include: { subasta: { include: subastaInclude } },
        orderBy: { app: { joinedAt: 'desc' } },
      }),
    ]);

    const byId = new Map<number, any>();
    for (const p of participations) {
      byId.set(p.subastaId, { ...mapSubasta(p.subasta), followed: true, participating: true });
    }
    for (const f of favorites) {
      if (!byId.has(f.subastaId)) {
        byId.set(f.subastaId, { ...mapSubasta(f.subasta), followed: true, participating: false });
      }
    }
    return { auctions: Array.from(byId.values()) };
  },

  async getPurchases(personaId: number, req: Request) {
    const { skip, limit, page } = getPagination(req);
    const [purchases, total] = await Promise.all([
      prisma.registroDeSubasta.findMany({
        where: { clienteId: personaId },
        skip,
        take: limit,
        include: { app: true, producto: { include: { app: true, seguro: true, fotos: { take: 1, include: { app: true } } } } },
        orderBy: { app: { createdAt: 'desc' } },
      }),
      prisma.registroDeSubasta.count({ where: { clienteId: personaId } }),
    ]);
    const mapped = purchases.map((p) => {
      const prod = flattenProducto(p.producto) as any;
      if (prod?.seguro) prod.seguro = { ...prod.seguro, polizaCombinada: fromSiNo(prod.seguro.polizaCombinada) };
      return { ...p, ...p.app, producto: prod };
    });
    return { purchases: mapped, total, page };
  },

  /** Productos de los que el usuario es DUEÑO (piezas entregadas para subasta),
   *  con su ubicación de depósito y póliza de seguro. */
  async getProducts(personaId: number) {
    const productos = await prisma.producto.findMany({
      where: { duenioId: personaId },
      include: { app: true, seguro: true, fotos: { take: 1, include: { app: true } } },
      orderBy: { identificador: 'desc' },
    });
    const products = productos.map((p) => {
      const prod = flattenProducto(p) as any;
      prod.seguro = p.seguro ? { ...p.seguro, polizaCombinada: fromSiNo(p.seguro.polizaCombinada) } : null;
      return prod;
    });
    return { products };
  },
};
