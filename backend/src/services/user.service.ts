import { prisma } from '../config/prisma';
import { getPagination } from '../utils/pagination';
import { subastaInclude, mapSubasta } from './auction.service';
import { flattenProducto } from '../utils/flatten';
import { fromSiNo } from '../utils/siNo';
import { Request } from 'express';

/** Premio (prima) anual estimado de una póliza = % del valor asegurado.
 *  Se usa para mostrar/cobrar la diferencia al aumentar el valor asegurado. */
const PREMIO_RATE = 0.02;

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
    const [participaciones, victorias, pujos, pujosPorSubasta] = await Promise.all([
      prisma.asistente.count({ where: { clienteId: personaId } }),
      prisma.registroDeSubasta.count({ where: { clienteId: personaId, app: { status: 'pagado' } } }),
      prisma.pujo.findMany({
        where: { asistente: { clienteId: personaId }, app: { confirmada: true } },
        select: { importe: true, app: { select: { moneda: true } }, asistente: { select: { subasta: { select: { categoria: true } } } } },
      }),
      prisma.pujo.groupBy({
        by: ['asistenteId'],
        where: { asistente: { clienteId: personaId }, app: { confirmada: true } },
        _count: { _all: true },
      }),
    ]);

    const registros = await prisma.registroDeSubasta.findMany({
      where: { clienteId: personaId },
      select: { importe: true, comision: true, app: { select: { moneda: true } } },
    });

    const totalPagadoARS = registros.filter((r) => r.app?.moneda === 'ARS').reduce((s, r) => s + Number(r.importe) + Number(r.comision), 0);
    const totalPagadoUSD = registros.filter((r) => r.app?.moneda === 'USD').reduce((s, r) => s + Number(r.importe) + Number(r.comision), 0);
    const totalOfertadoARS = pujos.filter((b) => b.app?.moneda === 'ARS').reduce((s, b) => s + Number(b.importe), 0);
    const totalOfertadoUSD = pujos.filter((b) => b.app?.moneda === 'USD').reduce((s, b) => s + Number(b.importe), 0);
    const totalPujos = pujos.length;

    const catCount: Record<string, number> = {};
    for (const p of pujos) {
      const cat = p.asistente?.subasta?.categoria ?? 'comun';
      catCount[cat] = (catCount[cat] ?? 0) + 1;
    }
    const pujosPorCategoria = Object.entries(catCount).map(([categoria, cantidad]) => ({ categoria, cantidad }));

    return { totalParticipaciones: participaciones, totalVictorias: victorias, totalPujos, totalPagadoARS, totalPagadoUSD, totalOfertadoARS, totalOfertadoUSD, pujosPorCategoria };
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

  /** Pólizas de las que el usuario es beneficiario (dueño). Una póliza por dueño,
   *  combinada si cubre varias piezas. Incluye el premio estimado (ver PREMIO_RATE) y
   *  la solicitud de aumento pendiente, si existe. */
  async getInsurances(personaId: number) {
    const polizas = await prisma.seguroApp.findMany({
      where: { duenioId: personaId },
      include: {
        seguro: {
          include: {
            productos: { include: { app: { select: { numeroPieza: true, status: true, moneda: true } } } },
            aumentos: { where: { estado: 'pendiente' }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { nroPoliza: 'asc' },
    });
    const seguros = polizas.map((pa) => {
      const importe = Number(pa.seguro.importe);
      const pend = pa.seguro.aumentos[0];
      return {
        nroPoliza: pa.seguro.nroPoliza,
        compania: pa.seguro.compania,
        importe,
        polizaCombinada: fromSiNo(pa.seguro.polizaCombinada),
        premioEstimado: Math.round(importe * PREMIO_RATE),
        solicitudPendiente: pend
          ? {
              id: pend.id,
              valorSolicitado: Number(pend.valorSolicitado),
              diferenciaPremio: Number(pend.diferenciaPremio),
              createdAt: pend.createdAt,
            }
          : null,
        productos: pa.seguro.productos.map((p) => ({
          identificador: p.identificador,
          descripcionCompleta: p.descripcionCompleta,
          numeroPieza: p.app?.numeroPieza ?? null,
          status: p.app?.status ?? null,
          moneda: p.app?.moneda ?? null,
        })),
      };
    });
    return { seguros };
  },

  /** El dueño SOLICITA aumentar el valor asegurado de su póliza. NO cambia el importe:
   *  crea una solicitud que la empresa (admin) debe aprobar. (Consigna: "ponerse en
   *  contacto con la compañía... y aumentar el valor de la póliza pagando la diferencia
   *  del premio"). */
  async requestInsuranceIncrease(personaId: number, nroPoliza: string, nuevoValor: number) {
    if (!Number.isFinite(nuevoValor) || nuevoValor <= 0) {
      throw { status: 400, message: 'El nuevo valor asegurado es inválido' };
    }
    const pa = await prisma.seguroApp.findUnique({ where: { nroPoliza }, include: { seguro: true } });
    if (!pa) throw { status: 404, message: 'Póliza no encontrada' };
    if (pa.duenioId !== personaId) throw { status: 403, message: 'No sos el beneficiario de esta póliza' };

    const valorActual = Number(pa.seguro.importe);
    if (nuevoValor <= valorActual) {
      throw { status: 400, message: `El nuevo valor debe ser mayor al actual (${valorActual}).` };
    }
    const yaPendiente = await prisma.seguroAumentoSolicitud.findFirst({ where: { nroPoliza, estado: 'pendiente' } });
    if (yaPendiente) throw { status: 409, message: 'Ya tenés una solicitud pendiente para esta póliza.' };

    const diferenciaPremio = Math.round((nuevoValor - valorActual) * PREMIO_RATE);
    const solicitud = await prisma.seguroAumentoSolicitud.create({
      data: { nroPoliza, duenioId: personaId, valorActual, valorSolicitado: nuevoValor, diferenciaPremio, estado: 'pendiente' },
    });
    return {
      id: solicitud.id,
      nroPoliza,
      valorActual,
      valorSolicitado: nuevoValor,
      diferenciaPremio,
      estado: solicitud.estado,
    };
  },
};
