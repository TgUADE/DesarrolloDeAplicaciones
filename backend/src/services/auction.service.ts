import { prisma } from '../config/prisma';
import { categoryService } from './category.service';
import { validateBidAmount } from '../utils/bidLimits';
import { paymentMethodService } from './paymentMethod.service';
import { messageService } from './message.service';
import { getPagination } from '../utils/pagination';
import { fromSiNo, toSiNo } from '../utils/siNo';
import { mapItem, flattenPersonaLite } from '../utils/flatten';
import { catalogService } from './catalog.service';
import { getSystemEmpleadoId, getEmpresaClienteId } from '../utils/systemEmpleado';

// Include para mapear un ItemCatalogo al shape plano `Item` (frontend-mobile).
const itemDetailInclude = {
  app: true,
  catalogo: { select: { subastaId: true } },
  producto: {
    include: {
      app: true,
      fotos: { orderBy: { app: { orden: 'asc' as const } }, include: { app: true } },
      duenio: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } },
    },
  },
} as const;
import { Request } from 'express';

export const ITEM_TIMER_MS = 1 * 60 * 1000;
const PURCHASE_COMMISSION_RATE = 0.1; // Comisión de COMPRA: 10% fijo sobre la oferta (lo paga el comprador). La comisión de VENTA es el % pactado con el vendedor (itemSubmission.comisionPorcentaje).
const PURCHASE_SHIPPING_RATE = 0.02;
const BLOCKING_PURCHASE_STATUSES = ['derivado_justicia'];
const FINE_RATE = 0.1;

function estimatePurchaseTotal(importe: number): number {
  return importe + importe * PURCHASE_COMMISSION_RATE + Math.round(importe * PURCHASE_SHIPPING_RATE);
}

function paymentMethodAvailableAmount(pm: { montoDisponible?: unknown; montoGarantia?: unknown } | null | undefined): number {
  return Number(pm?.montoDisponible ?? pm?.montoGarantia ?? 0);
}

function auctionStartAt(subasta: { app?: { fechaHora?: Date | null } | null; fecha?: Date | null; hora?: Date | null }): Date | null {
  return subasta.app?.fechaHora ?? subasta.fecha ?? subasta.hora ?? null;
}

function certifiedCheckWasVerifiedBeforeAuction(
  pm: { tipo: string; verifiedAt?: Date | null; updatedAt?: Date | null },
  subasta: { app?: { fechaHora?: Date | null } | null; fecha?: Date | null; hora?: Date | null },
): boolean {
  if (pm.tipo !== 'cheque_certificado') return true;
  const startAt = auctionStartAt(subasta);
  const approvedAt = pm.verifiedAt ?? pm.updatedAt ?? null;
  return !!startAt && !!approvedAt && approvedAt.getTime() < startAt.getTime();
}

function assertCertifiedCheckWasVerifiedBeforeAuction(
  pm: { tipo: string; verifiedAt?: Date | null; updatedAt?: Date | null },
  subasta: { app?: { fechaHora?: Date | null } | null; fecha?: Date | null; hora?: Date | null },
) {
  if (pm.tipo !== 'cheque_certificado') return;
  const startAt = auctionStartAt(subasta);
  if (!startAt) throw { status: 400, message: 'No se puede validar el inicio de la subasta para usar este cheque certificado' };
  if (!certifiedCheckWasVerifiedBeforeAuction(pm, subasta)) {
    throw { status: 403, message: 'El cheque certificado debe estar aprobado antes del inicio de la subasta' };
  }
}

async function getPendingPaymentMethodCommitment(tx: any, personaId: number, paymentMethodId: string, moneda: string): Promise<number> {
  const comprasPendientes = await tx.registroDeSubasta.findMany({
    where: {
      clienteId: personaId,
      app: {
        status: { in: ['pendiente_pago', 'multa_aplicada'] },
        paymentMethodId,
        moneda,
      },
    },
    select: { importe: true, comision: true, app: { select: { costoEnvio: true, multa: true } } },
  });
  return comprasPendientes.reduce(
    (sum: number, r: any) =>
      sum +
      Number(r.importe ?? 0) +
      Number(r.comision ?? 0) +
      Number(r.app?.costoEnvio ?? 0) +
      Number(r.app?.multa ?? 0),
    0,
  );
}

// Persona "lite" para postores/rematadores: apellido vive en personas_app.
const personaLiteInclude = { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } as const;

export const subastaInclude = {
  app: true,
  subastador: { include: { app: true, persona: personaLiteInclude } },
  _count: { select: { asistentes: true } },
  catalogos: {
    take: 1,
    include: {
      items: {
        take: 1,
        orderBy: { app: { ordenEnSubasta: 'asc' as const } },
        include: { producto: { include: { app: true, fotos: { take: 1, orderBy: { app: { orden: 'asc' as const } }, include: { app: true } } } } },
      },
    },
  },
};

export function mapSubasta(s: any) {
  return {
    ...s,
    ...(s.app ?? {}),
    id: s.identificador.toString(),
    status: s.estado,
    tieneDeposito: fromSiNo(s.tieneDeposito),
    seguridadPropia: fromSiNo(s.seguridadPropia),
    rematador: s.subastador
      ? { id: s.subastador.identificador.toString(), nombre: s.subastador.persona.nombre, apellido: s.subastador.persona.app?.apellido ?? '', matricula: s.subastador.matricula, activo: s.subastador.app?.activo ?? false }
      : null,
    items: s.catalogos?.[0]?.items?.map((i: any) => ({ id: i.identificador.toString(), images: i.producto?.fotos?.map((f: any) => ({ url: f.app?.url ?? null })) ?? [] })) ?? [],
  };
}

export const auctionService = {
  async list(req: Request, filters: { status?: string; categoria?: string; moneda?: string; search?: string }, userId?: string) {
    const { skip, limit, page } = getPagination(req);
    const where: Record<string, unknown> = {};
    if (filters.status) where.estado = filters.status;
    if (filters.categoria) where.categoria = filters.categoria;
    const appFilter: Record<string, unknown> = {};
    if (filters.moneda) appFilter.moneda = filters.moneda;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      appFilter.OR = [{ titulo: { contains: q, mode: 'insensitive' } }, { descripcion: { contains: q, mode: 'insensitive' } }, { nombreColeccion: { contains: q, mode: 'insensitive' } }];
    }
    if (Object.keys(appFilter).length) where.app = appFilter;

    const [subastas, total] = await Promise.all([
      prisma.subasta.findMany({ where, skip, take: limit, include: subastaInclude, orderBy: { app: { fechaHora: 'asc' } } }),
      prisma.subasta.count({ where }),
    ]);

    const mapped = subastas.map(mapSubasta);
    const withFlags = await this.attachUserFlags(mapped, userId ? parseInt(userId) : undefined);
    return { auctions: withFlags, total, page };
  },

  async attachUserFlags<T extends { identificador: number }>(subastas: T[], clienteId?: number) {
    if (!clienteId || subastas.length === 0) return subastas.map((s) => ({ ...s, followed: false, participating: false }));
    const ids = subastas.map((s) => s.identificador);
    const [favs, parts] = await Promise.all([
      prisma.auctionFavorite.findMany({ where: { clienteId, subastaId: { in: ids } }, select: { subastaId: true } }),
      prisma.asistente.findMany({ where: { clienteId, subastaId: { in: ids } }, select: { subastaId: true } }),
    ]);
    const favSet = new Set(favs.map((f) => f.subastaId));
    const partSet = new Set(parts.map((p) => p.subastaId));
    return subastas.map((s) => ({ ...s, participating: partSet.has(s.identificador), followed: favSet.has(s.identificador) || partSet.has(s.identificador) }));
  },

  async addFavorite(subastaId: number, userId: string) {
    const subasta = await prisma.subasta.findUnique({ where: { identificador: subastaId } });
    if (!subasta) throw { status: 404, message: 'Subasta no encontrada' };
    const clienteId = parseInt(userId);
    await prisma.auctionFavorite.upsert({
      where: { clienteId_subastaId: { clienteId, subastaId } },
      create: { clienteId, subastaId },
      update: {},
    });
  },

  async removeFavorite(subastaId: number, userId: string) {
    const clienteId = parseInt(userId);
    const participating = await prisma.asistente.findFirst({ where: { subastaId, clienteId } });
    if (participating) throw { status: 409, message: 'No podés dejar de seguir una subasta en la que participás' };
    await prisma.auctionFavorite.deleteMany({ where: { subastaId, clienteId } });
  },

  async findById(id: number) {
    const s = await prisma.subasta.findUnique({ where: { identificador: id }, include: subastaInclude });
    return s ? mapSubasta(s) : null;
  },

  async getCatalog(subastaId: number, showPrices: boolean) {
    const catalogo = await prisma.catalogo.findFirst({ where: { subastaId } });
    if (!catalogo) return [];
    const items = await prisma.itemCatalogo.findMany({
      where: { catalogoId: catalogo.identificador },
      include: itemDetailInclude,
      orderBy: { app: { ordenEnSubasta: 'asc' } },
    });
    return items.map((i) => mapItem(i, { includePrice: showPrices }));
  },

  async getCurrentItem(subastaId: number) {
    const subasta = await prisma.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } });
    const currentItemId = subasta?.app?.currentItemId;
    if (!currentItemId) return null;

    const itemCatalogo = await prisma.itemCatalogo.findUnique({
      where: { identificador: currentItemId },
      include: itemDetailInclude,
    });

    const lastBid = await prisma.pujo.findFirst({
      where: { itemId: currentItemId, app: { confirmada: true } },
      orderBy: { app: { createdAt: 'desc' } },
      include: { asistente: { include: { cliente: { include: { persona: personaLiteInclude } } } } },
    });

    return {
      item: mapItem(itemCatalogo, { includePrice: true }),
      mejorOferta: lastBid?.importe ?? null,
      mejorPostor: lastBid?.asistente?.cliente?.persona ? flattenPersonaLite(lastBid.asistente.cliente.persona) : null,
      endsAt: subasta?.app?.currentItemEndsAt ?? null,
    };
  },

  async getBids(subastaId: number, req: Request) {
    const subasta = await prisma.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } });
    const currentItemId = subasta?.app?.currentItemId;
    if (!currentItemId) return { bids: [], total: 0 };
    const { skip, limit, page } = getPagination(req);
    const [bids, total] = await Promise.all([
      prisma.pujo.findMany({
        where: { itemId: currentItemId, app: { confirmada: true } },
        skip, take: limit,
        include: { app: true, asistente: { include: { cliente: { include: { persona: personaLiteInclude } } } } },
        orderBy: { app: { createdAt: 'desc' } },
      }),
      prisma.pujo.count({ where: { itemId: currentItemId, app: { confirmada: true } } }),
    ]);
    const mapped = bids.map((b) => ({ id: b.identificador, monto: b.importe, moneda: b.app?.moneda ?? 'ARS', createdAt: b.app?.createdAt ?? null, user: flattenPersonaLite(b.asistente?.cliente?.persona) }));
    return { bids: mapped, total, page };
  },

  async join(subastaId: number, userId: string) {
    const personaId = parseInt(userId);
    const [subasta, persona] = await Promise.all([
      prisma.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } }),
      prisma.persona.findUnique({ where: { identificador: personaId }, include: { cliente: true, app: true, paymentMethods: { where: { verificado: true, activo: true } } } }),
    ]);
    if (!subasta) throw { status: 404, message: 'Subasta no encontrada' };
    if (subasta.estado !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };
    if (!persona) throw { status: 404, message: 'Usuario no encontrado' };
    if (persona.app?.registrationStatus !== 'aprobado') throw { status: 403, message: 'Tu cuenta no está aprobada' };
    if (!persona.cliente) throw { status: 403, message: 'No estás registrado como postor' };

    if (!categoryService.canAccessAuction(persona.cliente.categoria ?? 'comun', subasta.categoria ?? 'comun')) {
      throw { status: 403, message: 'Tu categoría no permite acceder a esta subasta' };
    }

    const blockingPurchase = await prisma.registroDeSubasta.findFirst({
      where: { clienteId: personaId, app: { status: { in: BLOCKING_PURCHASE_STATUSES } } },
      include: { app: true },
    });
    if (blockingPurchase?.app?.status === 'derivado_justicia') {
      throw { status: 403, message: 'Tu cuenta está bloqueada por una compra derivada a la justicia.' };
    }

    const activeParticipation = await prisma.asistente.findFirst({ where: { clienteId: personaId, subastaId: { not: subastaId }, app: { isActive: true } } });
    if (activeParticipation) throw { status: 409, message: 'Ya estás conectado a otra subasta' };

    const count = await prisma.asistente.count({ where: { subastaId } });
    await prisma.asistente.upsert({
      where: { subastaId_clienteId: { subastaId, clienteId: personaId } },
      create: { subastaId, clienteId: personaId, numeroPostor: count + 1, app: { create: { isActive: true } } },
      update: { app: { upsert: { create: { isActive: true }, update: { isActive: true, joinedAt: new Date(), leftAt: null } } } },
    });

    const auctionMoneda = subasta.app?.moneda ?? 'ARS';
    return { canBid: persona.paymentMethods.some((pm) => paymentMethodService.covers(pm.moneda, auctionMoneda) && certifiedCheckWasVerifiedBeforeAuction(pm, subasta)) };
  },

  async leave(subastaId: number, userId: string) {
    await prisma.asistenteApp.updateMany({ where: { asistente: { subastaId, clienteId: parseInt(userId) } }, data: { isActive: false, leftAt: new Date() } });
  },

  async placeBid(subastaId: number, userId: string, paymentMethodId: string, monto: number) {
    return await prisma.$transaction(async (tx) => {
      const personaId = parseInt(userId);
      const subasta = await tx.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } });
      const currentItemId = subasta?.app?.currentItemId;
      if (!currentItemId) throw { status: 400, message: 'No hay ítem activo en esta subasta' };
      if (subasta!.estado !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };

      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, currentItemId.toString());

      const [persona, asistente, itemCatalogo] = await Promise.all([
        tx.persona.findUnique({ where: { identificador: personaId }, include: { app: true, paymentMethods: { where: { id: paymentMethodId, verificado: true, activo: true } } } }),
        tx.asistente.findFirst({ where: { subastaId, clienteId: personaId, app: { isActive: true } } }),
        tx.itemCatalogo.findUnique({ where: { identificador: currentItemId }, include: { producto: { select: { duenioId: true } } } }),
      ]);

      if (!persona || persona.app?.registrationStatus !== 'aprobado') throw { status: 403, message: 'Usuario no autorizado' };
      if (!asistente) throw { status: 403, message: 'No estás conectado a esta subasta' };
      if (!itemCatalogo) throw { status: 404, message: 'Ítem no encontrado' };
      // El dueño de la pieza no puede pujar por su propio ítem.
      if (itemCatalogo.producto?.duenioId === personaId) throw { status: 403, message: 'No podés pujar por tu propio ítem' };

      const blockingPurchase = await tx.registroDeSubasta.findFirst({
        where: { clienteId: personaId, app: { status: { in: BLOCKING_PURCHASE_STATUSES } } },
        include: { app: true },
      });
      if (blockingPurchase?.app?.status === 'derivado_justicia') {
        throw { status: 403, message: 'Tu cuenta está bloqueada por una compra derivada a la justicia.' };
      }

      const pm = persona.paymentMethods[0];
      if (!pm) throw { status: 403, message: 'Medio de pago no encontrado o no verificado' };

      const moneda = subasta!.app?.moneda ?? 'ARS';
      if (!paymentMethodService.covers(pm.moneda, moneda)) {
        throw { status: 400, message: `Necesitás un medio de pago en ${moneda} para pujar en esta subasta` };
      }
      if (paymentMethodAvailableAmount(pm) <= 0) {
        throw { status: 400, message: 'El medio de pago no tiene monto disponible declarado' };
      }
      assertCertifiedCheckWasVerifiedBeforeAuction(pm, subasta!);

      // Si el monto disponible no alcanza, la puja se permite. Si gana, la compra
      // se registra con multa del 10% al cerrar el ítem.

      const pendingBid = await tx.pujo.findFirst({ where: { asistenteId: asistente.identificador, itemId: currentItemId, app: { confirmada: false } } });
      if (pendingBid) throw { status: 409, message: 'Ya tenés una puja pendiente de confirmación' };

      const lastBid = await tx.pujo.findFirst({ where: { itemId: currentItemId, app: { confirmada: true } }, orderBy: { app: { createdAt: 'desc' } }, include: { asistente: true } });
      const ultimaOferta = Number(lastBid?.importe ?? itemCatalogo.precioBase);

      if (lastBid && lastBid.asistente.clienteId === personaId) {
        throw { status: 409, message: 'Ya sos el mejor postor. Esperá que alguien más puje.' };
      }

      const validation = validateBidAmount(monto, Number(itemCatalogo.precioBase), ultimaOferta, subasta!.categoria ?? 'comun');
      if (!validation.valid) throw { status: 422, message: validation.error };

      const pujo = await tx.pujo.create({
        data: { asistenteId: asistente.identificador, itemId: currentItemId, importe: monto, app: { create: { moneda, confirmada: false, paymentMethodId: pm.id } } },
      });
      const confirmed = await tx.pujo.update({ where: { identificador: pujo.identificador }, data: { app: { update: { confirmada: true } } }, include: { app: true } });

      const endsAt = new Date(Date.now() + ITEM_TIMER_MS);
      await tx.subasta.update({ where: { identificador: subastaId }, data: { app: { update: { currentItemEndsAt: endsAt } } } });

      // Devolver la puja con la MISMA forma que getBids (id, monto, moneda, user) para
      // que el front la agregue a la lista sin colisión de keys (socket + optimista).
      const puja = {
        id: confirmed.identificador,
        monto: confirmed.importe,
        moneda: confirmed.app?.moneda ?? moneda,
        createdAt: confirmed.app?.createdAt ?? null,
        user: { id: persona.identificador.toString(), nombre: persona.nombre, apellido: persona.app?.apellido ?? '' },
      };
      return { puja, mejorOferta: monto, endsAt };
    });
  },

  async closeItem(subastaId: number) {
    return await prisma.$transaction(async (tx) => {
      const subasta = await tx.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } });
      const currentItemId = subasta?.app?.currentItemId;
      if (!currentItemId) throw { status: 400, message: 'No hay ítem activo' };
      const moneda = subasta!.app?.moneda ?? 'ARS';

      const [lastBid, itemCatalogo] = await Promise.all([
        tx.pujo.findFirst({
          where: { itemId: currentItemId, app: { confirmada: true } },
          orderBy: { app: { createdAt: 'desc' } },
          include: { asistente: true, app: true },
        }),
        tx.itemCatalogo.findUnique({ where: { identificador: currentItemId }, include: { producto: true } }),
      ]);
      if (!itemCatalogo) throw { status: 404, message: 'Ítem no encontrado' };

      let registro = null;

      if (lastBid) {
        // Adjudicación al mejor postor.
        const importe = Number(lastBid.importe);
        const comision = importe * PURCHASE_COMMISSION_RATE;
        const costoEnvio = Math.round(importe * PURCHASE_SHIPPING_RATE);
        const paymentMethod = lastBid.app?.paymentMethodId
          ? await tx.paymentMethod.findUnique({ where: { id: lastBid.app.paymentMethodId } })
          : null;
        const pendingCommitment = paymentMethod
          ? await getPendingPaymentMethodCommitment(tx, lastBid.asistente.clienteId, paymentMethod.id, moneda)
          : 0;
        const purchaseTotal = estimatePurchaseTotal(importe);
        const insufficientFunds = paymentMethod ? pendingCommitment + purchaseTotal > paymentMethodAvailableAmount(paymentMethod) : false;
        const multa = insufficientFunds ? importe * FINE_RATE : null;
        const pagoVencimientoAt = insufficientFunds ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null;
        registro = await tx.registroDeSubasta.create({
          data: {
            subastaId,
            duenioId: itemCatalogo.producto.duenioId,
            productoId: itemCatalogo.productoId,
            clienteId: lastBid.asistente.clienteId,
            importe: lastBid.importe,
            comision,
            app: {
              create: {
                moneda,
                status: insufficientFunds ? 'multa_aplicada' : 'pendiente_pago',
                paymentMethodId: lastBid.app?.paymentMethodId ?? null,
                costoEnvio,
                multa,
                multaAplicadaAt: insufficientFunds ? new Date() : null,
                pagoVencimientoAt,
              },
            },
          },
        });
        // Marcar la puja ganadora.
        await tx.pujo.update({ where: { identificador: lastBid.identificador }, data: { ganador: 'si' } });
        // Pieza vendida: marcar item y producto.
        await tx.itemCatalogo.update({ where: { identificador: currentItemId }, data: { subastado: toSiNo(true), app: { update: { status: 'vendido' } } } });
        await tx.producto.update({ where: { identificador: itemCatalogo.productoId }, data: { disponible: toSiNo(false), app: { update: { status: 'vendido' } } } });
        await messageService.sendPurchaseMessage(
          lastBid.asistente.clienteId,
          itemCatalogo.producto.descripcionCatalogo ?? itemCatalogo.producto.descripcionCompleta,
          importe,
          comision,
          costoEnvio,
          moneda,
        );
        if (insufficientFunds) {
          await messageService.create(
            lastBid.asistente.clienteId,
            'Multa aplicada por fondos insuficientes',
            `Tu medio de pago no cubre el total estimado de la compra. Se aplicó una multa del 10% (${moneda} ${multa}) y tenés 72 horas para presentar los fondos.`,
            'multa',
          );
        }
      } else {
        // Nadie pujó: la empresa compra la pieza al valor base.
        const empresaClienteId = await getEmpresaClienteId();
        const comision = Number(itemCatalogo.precioBase) * PURCHASE_COMMISSION_RATE;
        registro = await tx.registroDeSubasta.create({
          data: {
            subastaId,
            duenioId: itemCatalogo.producto.duenioId,
            productoId: itemCatalogo.productoId,
            clienteId: empresaClienteId,
            importe: itemCatalogo.precioBase,
            comision,
            app: { create: { moneda, status: 'pagado' } },
          },
        });
        await tx.itemCatalogo.update({ where: { identificador: currentItemId }, data: { subastado: toSiNo(true), app: { update: { status: 'vendido' } } } });
        await tx.producto.update({ where: { identificador: itemCatalogo.productoId }, data: { disponible: toSiNo(false), app: { update: { status: 'vendido' } } } });
      }

      // Avanzar automáticamente al siguiente ítem disponible del catálogo (uno a la vez).
      const next = await tx.itemCatalogo.findFirst({
        where: { catalogo: { subastaId }, app: { status: 'en_subasta' } },
        orderBy: { app: { ordenEnSubasta: 'asc' } },
      });
      const nextEndsAt = next ? new Date(Date.now() + ITEM_TIMER_MS) : null;
      await tx.subasta.update({
        where: { identificador: subastaId },
        data: { app: { update: { currentItemId: next?.identificador ?? null, currentItemEndsAt: nextEndsAt } } },
      });
      return { purchase: registro, closedItemId: currentItemId, nextItemId: next?.identificador ?? null };
    });
  },

  canManage(createdById: number | null | undefined, user: { userId: string; isAdmin?: boolean }) {
    return !!user.isAdmin || createdById?.toString() === user.userId;
  },

  async startItem(subastaId: number, itemCatalogoId: number, user: { userId: string; isAdmin?: boolean }) {
    const subasta = await prisma.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } });
    if (!subasta) throw { status: 404, message: 'Subasta no encontrada' };
    if (!this.canManage(subasta.app?.createdById, user)) throw { status: 403, message: 'Solo el creador o un admin pueden iniciar ítems' };
    if (subasta.estado !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };
    if (subasta.app?.currentItemId) throw { status: 409, message: 'Ya hay un ítem en remate' };

    const itemCatalogo = await prisma.itemCatalogo.findUnique({
      where: { identificador: itemCatalogoId },
      include: itemDetailInclude,
    });
    if (!itemCatalogo || itemCatalogo.catalogo.subastaId !== subastaId) throw { status: 404, message: 'Ítem no encontrado en la subasta' };
    if (itemCatalogo.app?.status !== 'en_subasta') throw { status: 400, message: 'El ítem no está disponible para rematar' };

    const endsAt = new Date(Date.now() + ITEM_TIMER_MS);
    await prisma.subasta.update({ where: { identificador: subastaId }, data: { app: { update: { currentItemId: itemCatalogoId, currentItemEndsAt: endsAt } } } });

    return { item: mapItem(itemCatalogo, { includePrice: true }), endsAt };
  },

  async autoCloseExpiredItems() {
    const expired = await prisma.subasta.findMany({
      where: { estado: 'abierta', app: { currentItemId: { not: null }, currentItemEndsAt: { lte: new Date() } } },
      select: { identificador: true },
    });
    const results = [];
    for (const s of expired) {
      try {
        const result = await this.closeItem(s.identificador);
        results.push({ auctionId: s.identificador, ...result });
      } catch {}
    }
    return results;
  },

  async addItem(subastaId: number, productoId: number, precioBase?: number, comision?: number) {
    const [subasta, producto] = await Promise.all([
      prisma.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } }),
      prisma.producto.findUnique({ where: { identificador: productoId }, include: { app: true } }),
    ]);
    if (!subasta) throw { status: 404, message: 'Subasta no encontrada' };
    if (!producto) throw { status: 404, message: 'Producto no encontrado' };
    if (producto.app?.status !== 'disponible') throw { status: 400, message: 'El producto no está disponible' };

    const auctionMoneda = subasta.app?.moneda ?? 'ARS';
    const itemMoneda = producto.app?.moneda ?? 'ARS';
    if (itemMoneda !== auctionMoneda) {
      throw { status: 400, message: `El ítem está valuado en ${itemMoneda} y la subasta es en ${auctionMoneda}. Solo podés agregar ítems en ${auctionMoneda}.` };
    }

    let catalogo = await prisma.catalogo.findFirst({ where: { subastaId } });
    if (!catalogo) {
      catalogo = await prisma.catalogo.create({ data: { subastaId, descripcion: `Catálogo Subasta ${subastaId}`, responsableId: await getSystemEmpleadoId() } });
    }

    return catalogService.addItem(catalogo.identificador, productoId, precioBase, comision);
  },

  async getParticipants(subastaId: number) {
    const asistentes = await prisma.asistente.findMany({
      where: { subastaId, app: { isActive: true } },
      include: { cliente: { include: { persona: personaLiteInclude } } },
    });
    return asistentes.map((a) => ({ ...a, cliente: { ...a.cliente, persona: flattenPersonaLite(a.cliente.persona) } }));
  },

  async create(data: { titulo: string; descripcion?: string; fechaHora: Date; ubicacion: string; categoria: string; moneda: string; rematadorId: string; esColeccion?: boolean; nombreColeccion?: string }) {
    // La consigna no exige una antelación mínima: solo validamos que la fecha sea válida.
    if (!data.fechaHora || isNaN(data.fechaHora.getTime())) throw { status: 400, message: 'Fecha y hora de la subasta inválida' };
    const s = await prisma.subasta.create({
      data: {
        fecha: data.fechaHora,
        hora: data.fechaHora,
        ubicacion: data.ubicacion,
        categoria: data.categoria,
        subastadorId: parseInt(data.rematadorId),
        estado: 'programada',
        app: {
          create: {
            titulo: data.titulo,
            descripcion: data.descripcion,
            fechaHora: data.fechaHora,
            moneda: data.moneda,
            esColeccion: data.esColeccion ?? false,
            nombreColeccion: data.nombreColeccion,
          },
        },
      },
      include: subastaInclude,
    });
    return mapSubasta(s);
  },

  async update(id: number, data: Partial<{ titulo: string; descripcion: string; fechaHora: Date; ubicacion: string; status: string; esColeccion: boolean; nombreColeccion: string; rematadorId: string }>) {
    const coreData: any = {};
    const appData: any = {};
    if (data.titulo !== undefined) appData.titulo = data.titulo;
    if (data.descripcion !== undefined) appData.descripcion = data.descripcion;
    if (data.esColeccion !== undefined) appData.esColeccion = data.esColeccion;
    if (data.nombreColeccion !== undefined) appData.nombreColeccion = data.nombreColeccion;
    if (data.fechaHora !== undefined) { appData.fechaHora = data.fechaHora; coreData.fecha = data.fechaHora; coreData.hora = data.fechaHora; }
    if (data.ubicacion !== undefined) coreData.ubicacion = data.ubicacion;
    if (data.status) coreData.estado = data.status;
    if (data.rematadorId) coreData.subastadorId = parseInt(data.rematadorId);

    const s = await prisma.subasta.update({
      where: { identificador: id },
      data: { ...coreData, ...(Object.keys(appData).length ? { app: { update: appData } } : {}) },
      include: subastaInclude,
    });
    return mapSubasta(s);
  },

  async startAuction(id: number) {
    const subasta = await prisma.subasta.findUnique({ where: { identificador: id } });
    if (!subasta) throw { status: 404, message: 'Subasta no encontrada' };
    if (subasta.estado === 'abierta') throw { status: 409, message: 'La subasta ya está abierta' };
    if (subasta.estado === 'cerrada' || subasta.estado === 'finalizada') throw { status: 400, message: 'La subasta ya finalizó' };
    const catalogo = await prisma.catalogo.findFirst({ where: { subastaId: id }, select: { identificador: true } });
    if (!catalogo) throw { status: 400, message: 'La subasta no tiene un catálogo asignado' };
    // Al abrir la subasta arranca automáticamente el primer ítem del catálogo.
    const first = await prisma.itemCatalogo.findFirst({
      where: { catalogo: { subastaId: id }, app: { status: 'en_subasta' } },
      orderBy: { app: { ordenEnSubasta: 'asc' } },
    });
    if (!first) throw { status: 400, message: 'El catálogo de la subasta no tiene ítems disponibles' };
    const endsAt = new Date(Date.now() + ITEM_TIMER_MS);
    const s = await prisma.subasta.update({
      where: { identificador: id },
      data: { estado: 'abierta', app: { update: { currentItemId: first.identificador, currentItemEndsAt: endsAt } } },
      include: subastaInclude,
    });
    return mapSubasta(s);
  },
};
