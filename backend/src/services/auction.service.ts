import { AuctionCategory, AuctionStatus, Currency } from '@prisma/client';
import { prisma } from '../config/prisma';
import { categoryService } from './category.service';
import { validateBidAmount } from '../utils/bidLimits';
import { paymentMethodService } from './paymentMethod.service';
import { messageService } from './message.service';
import { getPagination } from '../utils/pagination';
import { Request } from 'express';

/** Tiempo máximo de un ítem en remate desde la última puja (60 minutos). */
export const ITEM_TIMER_MS = 60 * 60 * 1000;

export const auctionService = {
  async list(
    req: Request,
    filters: { status?: AuctionStatus; categoria?: AuctionCategory; moneda?: Currency; search?: string },
    userId?: string,
  ) {
    const { skip, limit, page } = getPagination(req);
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.moneda) where.moneda = filters.moneda;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { titulo: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
        { nombreColeccion: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        skip,
        take: limit,
        include: {
          rematador: true,
          _count: { select: { items: true, participants: true } },
          items: {
            take: 1,
            orderBy: { ordenEnSubasta: 'asc' },
            select: { id: true, images: { take: 1, orderBy: { orden: 'asc' }, select: { url: true } } },
          },
        },
        orderBy: { fechaHora: 'asc' },
      }),
      prisma.auction.count({ where }),
    ]);

    const withFlags = await this.attachUserFlags(auctions, userId);
    return { auctions: withFlags, total, page };
  },

  /** Agrega `followed` (favorito) y `participating` por subasta para el usuario dado. */
  async attachUserFlags<T extends { id: string }>(auctions: T[], userId?: string) {
    if (!userId || auctions.length === 0) {
      return auctions.map((a) => ({ ...a, followed: false, participating: false }));
    }
    const ids = auctions.map((a) => a.id);
    const [favs, parts] = await Promise.all([
      prisma.auctionFavorite.findMany({ where: { userId, auctionId: { in: ids } }, select: { auctionId: true } }),
      prisma.auctionParticipant.findMany({ where: { userId, auctionId: { in: ids } }, select: { auctionId: true } }),
    ]);
    const favSet = new Set(favs.map((f) => f.auctionId));
    const partSet = new Set(parts.map((p) => p.auctionId));
    return auctions.map((a) => ({
      ...a,
      participating: partSet.has(a.id),
      // Participar marca con estrella automáticamente.
      followed: favSet.has(a.id) || partSet.has(a.id),
    }));
  },

  async addFavorite(auctionId: string, userId: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    await prisma.auctionFavorite.upsert({
      where: { userId_auctionId: { userId, auctionId } },
      create: { userId, auctionId },
      update: {},
    });
  },

  async removeFavorite(auctionId: string, userId: string) {
    // No se puede dejar de seguir una subasta en la que se participa.
    const participating = await prisma.auctionParticipant.findFirst({ where: { auctionId, userId } });
    if (participating) {
      throw { status: 409, message: 'No podés dejar de seguir una subasta en la que participás' };
    }
    await prisma.auctionFavorite.deleteMany({ where: { auctionId, userId } });
  },

  async findById(id: string) {
    return prisma.auction.findUnique({
      where: { id },
      include: {
        rematador: true,
        _count: { select: { items: true, participants: true } },
        items: {
          take: 1,
          orderBy: { ordenEnSubasta: 'asc' },
          select: { id: true, images: { take: 1, orderBy: { orden: 'asc' }, select: { url: true } } },
        },
      },
    });
  },

  async getCatalog(id: string, showPrices: boolean) {
    const items = await prisma.item.findMany({
      where: { auctionId: id },
      include: {
        images: { take: 1, orderBy: { orden: 'asc' } },
        currentOwner: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { ordenEnSubasta: 'asc' },
    });

    if (!showPrices) {
      return items.map(({ precioBase: _, ...item }) => item);
    }
    return items;
  },

  async getCurrentItem(auctionId: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction?.currentItemId) return null;

    const item = await prisma.item.findUnique({
      where: { id: auction.currentItemId },
      include: { images: { orderBy: { orden: 'asc' } } },
    });

    const lastBid = await prisma.puja.findFirst({
      where: { itemId: auction.currentItemId, confirmada: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, nombre: true, apellido: true } } },
    });

    return {
      item,
      mejorOferta: lastBid?.monto ?? null,
      mejorPostor: lastBid?.user ?? null,
      endsAt: auction.currentItemEndsAt,
    };
  },

  async getBids(auctionId: string, req: Request) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction?.currentItemId) return { bids: [], total: 0 };
    const { skip, limit, page } = getPagination(req);
    const [bids, total] = await Promise.all([
      prisma.puja.findMany({
        where: { itemId: auction.currentItemId, confirmada: true },
        skip, take: limit,
        include: { user: { select: { id: true, nombre: true, apellido: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.puja.count({ where: { itemId: auction.currentItemId, confirmada: true } }),
    ]);
    return { bids, total, page };
  },

  async join(auctionId: string, userId: string) {
    const [auction, user] = await Promise.all([
      prisma.auction.findUnique({ where: { id: auctionId } }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { paymentMethods: { where: { verificado: true, activo: true } } },
      }),
    ]);

    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    if (auction.status !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };
    if (!user) throw { status: 404, message: 'Usuario no encontrado' };
    if (user.status !== 'aprobado') throw { status: 403, message: 'Tu cuenta no está aprobada' };

    if (!categoryService.canAccessAuction(user.categoria, auction.categoria as AuctionCategory)) {
      throw { status: 403, message: 'Tu categoría no permite acceder a esta subasta' };
    }

    // Check already in another auction
    const activeParticipation = await prisma.auctionParticipant.findFirst({
      where: { userId, isActive: true, auctionId: { not: auctionId } },
    });
    if (activeParticipation) {
      throw { status: 409, message: 'Ya estás conectado a otra subasta' };
    }

    await prisma.auctionParticipant.upsert({
      where: { auctionId_userId: { auctionId, userId } },
      create: { auctionId, userId, isActive: true },
      update: { isActive: true, joinedAt: new Date(), leftAt: null },
    });

    return { canBid: user.paymentMethods.length > 0 };
  },

  async leave(auctionId: string, userId: string) {
    await prisma.auctionParticipant.updateMany({
      where: { auctionId, userId },
      data: { isActive: false, leftAt: new Date() },
    });
  },

  async placeBid(auctionId: string, userId: string, paymentMethodId: string, monto: number) {
    return await prisma.$transaction(async (tx) => {
      // Advisory lock per item to prevent concurrent bids
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction || !auction.currentItemId) throw { status: 400, message: 'No hay ítem activo en esta subasta' };
      if (auction.status !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };

      // Lock on item. Usar executeRaw: pg_advisory_xact_lock devuelve void y
      // $queryRaw falla al intentar deserializar la columna ('Failed to deserialize column of type void').
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, auction.currentItemId);

      const [user, participant, item] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          include: { paymentMethods: { where: { id: paymentMethodId, verificado: true, activo: true } } },
        }),
        tx.auctionParticipant.findFirst({ where: { auctionId, userId, isActive: true } }),
        tx.item.findUnique({ where: { id: auction.currentItemId } }),
      ]);

      if (!user || user.status !== 'aprobado') throw { status: 403, message: 'Usuario no autorizado' };
      if (!participant) throw { status: 403, message: 'No estás conectado a esta subasta' };
      if (!item) throw { status: 404, message: 'Ítem no encontrado' };

      const pm = user.paymentMethods[0];
      if (!pm) throw { status: 403, message: 'Medio de pago no encontrado o no verificado' };

      // Currency check
      if (auction.moneda === 'USD' && !paymentMethodService.isUsdCapable(pm.tipo)) {
        throw { status: 400, message: 'Esta subasta es en USD, usá un medio de pago internacional' };
      }

      // Cheque guarantee check
      if (pm.tipo === 'cheque_certificado' && pm.montoGarantia) {
        const pendingPurchases = await tx.purchase.aggregate({
          where: { buyerId: userId, status: { in: ['pendiente_pago', 'multa_aplicada'] } },
          _sum: { montoGanador: true },
        });
        const usedAmount = Number(pendingPurchases._sum.montoGanador ?? 0);
        if (usedAmount + monto > Number(pm.montoGarantia)) {
          throw { status: 400, message: 'El monto supera tu garantía de cheque certificado' };
        }
      }

      // No pending unconfirmed bid
      const pendingBid = await tx.puja.findFirst({
        where: { itemId: auction.currentItemId, userId, confirmada: false },
      });
      if (pendingBid) throw { status: 409, message: 'Ya tenés una puja pendiente de confirmación' };

      // Get last confirmed bid
      const lastBid = await tx.puja.findFirst({
        where: { itemId: auction.currentItemId, confirmada: true },
        orderBy: { createdAt: 'desc' },
      });
      const ultimaOferta = Number(lastBid?.monto ?? item.precioBase);

      const validation = validateBidAmount(monto, Number(item.precioBase), ultimaOferta, auction.categoria as AuctionCategory);
      if (!validation.valid) throw { status: 422, message: validation.error };

      const puja = await tx.puja.create({
        data: {
          auctionId,
          itemId: auction.currentItemId,
          userId,
          monto,
          moneda: auction.moneda,
          confirmada: false,
        },
      });

      // Confirm immediately (system confirmation)
      const confirmed = await tx.puja.update({
        where: { id: puja.id },
        data: { confirmada: true },
      });

      // Reiniciar el temporizador del ítem: 5 minutos desde esta puja.
      const endsAt = new Date(Date.now() + ITEM_TIMER_MS);
      await tx.auction.update({ where: { id: auctionId }, data: { currentItemEndsAt: endsAt } });

      return { puja: confirmed, mejorOferta: monto, endsAt };
    });
  },

  async closeItem(auctionId: string) {
    return await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction?.currentItemId) throw { status: 400, message: 'No hay ítem activo' };

      const lastBid = await tx.puja.findFirst({
        where: { itemId: auction.currentItemId, confirmada: true },
        orderBy: { createdAt: 'desc' },
      });

      const item = await tx.item.findUnique({ where: { id: auction.currentItemId } });
      if (!item) throw { status: 404, message: 'Ítem no encontrado' };

      let purchase = null;
      if (lastBid) {
        // Winner!
        await tx.item.update({
          where: { id: auction.currentItemId },
          data: { status: 'vendido', currentOwnerId: lastBid.userId },
        });

        const COMMISSION_RATE = 0.05;
        const comisiones = Number(lastBid.monto) * COMMISSION_RATE;

        purchase = await tx.purchase.create({
          data: {
            itemId: auction.currentItemId,
            buyerId: lastBid.userId,
            montoGanador: lastBid.monto,
            moneda: lastBid.moneda,
            comisiones,
          },
        });

        await messageService.sendPurchaseMessage(
          lastBid.userId,
          item.descripcion,
          Number(lastBid.monto),
          comisiones,
          null,
          auction.moneda
        );
      } else {
        // Company buys at base price
        await tx.item.update({
          where: { id: auction.currentItemId },
          data: { status: 'vendido' },
        });
      }

      // No se auto-avanza: el creador/admin inicia el próximo ítem manualmente.
      await tx.auction.update({
        where: { id: auctionId },
        data: { currentItemId: null, currentItemEndsAt: null },
      });

      return { purchase, closedItemId: auction.currentItemId };
    });
  },

  /** ¿El usuario puede gestionar (iniciar/cerrar ítems de) esta subasta? */
  canManage(auction: { createdById: string | null }, user: { userId: string; isAdmin?: boolean }) {
    return !!user.isAdmin || auction.createdById === user.userId;
  },

  /** Inicia un ítem del catálogo: lo fija como actual y arranca el temporizador. */
  async startItem(auctionId: string, itemId: string, user: { userId: string; isAdmin?: boolean }) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    if (!this.canManage(auction, user)) {
      throw { status: 403, message: 'Solo el creador de la subasta o un admin pueden iniciar ítems' };
    }
    if (auction.status !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };
    if (auction.currentItemId) throw { status: 409, message: 'Ya hay un ítem en remate' };

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item || item.auctionId !== auctionId) throw { status: 404, message: 'Ítem no encontrado en la subasta' };
    if (item.status !== 'en_subasta') throw { status: 400, message: 'El ítem no está disponible para rematar' };

    const endsAt = new Date(Date.now() + ITEM_TIMER_MS);
    await prisma.auction.update({
      where: { id: auctionId },
      data: { currentItemId: itemId, currentItemEndsAt: endsAt },
    });

    const fullItem = await prisma.item.findUnique({
      where: { id: itemId },
      include: { images: { orderBy: { orden: 'asc' } } },
    });
    return { item: fullItem, endsAt };
  },

  /** Cierra los ítems cuyo temporizador venció. Devuelve los cierres para emitir por socket. */
  async autoCloseExpiredItems() {
    const expired = await prisma.auction.findMany({
      where: { status: 'abierta', currentItemId: { not: null }, currentItemEndsAt: { lte: new Date() } },
      select: { id: true },
    });
    const results = [];
    for (const a of expired) {
      try {
        const result = await this.closeItem(a.id);
        results.push({ auctionId: a.id, ...result });
      } catch {
        // si otro proceso ya lo cerró, ignorar
      }
    }
    return results;
  },

  async addItem(auctionId: string, itemId: string) {
    const [auction, item] = await Promise.all([
      prisma.auction.findUnique({ where: { id: auctionId } }),
      prisma.item.findUnique({ where: { id: itemId } }),
    ]);
    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    if (!item) throw { status: 404, message: 'Ítem no encontrado' };
    if (item.status !== 'disponible') throw { status: 400, message: 'El ítem no está disponible' };

    const count = await prisma.item.count({ where: { auctionId } });

    return prisma.item.update({
      where: { id: itemId },
      data: { auctionId, status: 'en_subasta', ordenEnSubasta: count + 1 },
    });
  },

  async getParticipants(auctionId: string) {
    return prisma.auctionParticipant.findMany({
      where: { auctionId, isActive: true },
      include: { user: { select: { id: true, nombre: true, apellido: true, categoria: true } } },
    });
  },

  async create(data: {
    titulo: string;
    descripcion?: string;
    fechaHora: Date;
    ubicacion: string;
    categoria: AuctionCategory;
    moneda: Currency;
    rematadorId: string;
    esColeccion?: boolean;
    nombreColeccion?: string;
  }) {
    return prisma.auction.create({ data, include: { rematador: true } });
  },

  async update(id: string, data: Partial<{
    titulo: string; descripcion: string; fechaHora: Date; ubicacion: string;
    status: AuctionStatus; esColeccion: boolean; nombreColeccion: string; rematadorId: string;
  }>) {
    return prisma.auction.update({ where: { id }, data, include: { rematador: true } });
  },

  /**
   * Abre (inicia) una subasta inmediatamente, incluso antes de su `fechaHora`
   * programada. No hay validación de fecha: el admin/creador puede adelantar el
   * inicio cuando quiera.
   */
  async startAuction(id: string) {
    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    if (auction.status === 'abierta') throw { status: 409, message: 'La subasta ya está abierta' };
    if (auction.status === 'cerrada' || auction.status === 'finalizada') {
      throw { status: 400, message: 'La subasta ya finalizó' };
    }
    return prisma.auction.update({
      where: { id },
      data: { status: 'abierta' },
      include: { rematador: true },
    });
  },
};
