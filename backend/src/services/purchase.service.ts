import { prisma } from '../config/prisma';
import { emailService } from './email.service';
import { messageService } from './message.service';
import { categoryService } from './category.service';
import { flattenProducto, flattenPersonaLite } from '../utils/flatten';

export const purchaseService = {
  async findById(id: number) {
    const r = await prisma.registroDeSubasta.findUnique({
      where: { identificador: id },
      include: {
        app: true,
        producto: { include: { app: true, fotos: { take: 1, include: { app: true } } } },
        cliente: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } } },
      },
    });
    if (!r) return null;
    return { ...r, ...r.app, producto: flattenProducto(r.producto), cliente: { ...r.cliente, persona: flattenPersonaLite(r.cliente.persona) } };
  },

  async applyFine(id: number) {
    const registro = await prisma.registroDeSubasta.findUnique({
      where: { identificador: id },
      include: { app: true, cliente: { include: { persona: { include: { app: true } } } } },
    });
    if (!registro) throw { status: 404, message: 'Compra no encontrada' };
    if (registro.app?.status !== 'pendiente_pago') throw { status: 400, message: 'Estado inválido para aplicar multa' };

    const multa = Number(registro.importe) * 0.1;
    const pagoVencimientoAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const moneda = registro.app?.moneda ?? 'ARS';

    const updated = await prisma.registroDeSubasta.update({
      where: { identificador: id },
      data: { app: { update: { status: 'multa_aplicada', multa, multaAplicadaAt: new Date(), pagoVencimientoAt } } },
      include: { app: true },
    });

    if (registro.clienteId) {
      await messageService.create(
        registro.clienteId,
        'Multa aplicada a tu compra',
        `Se aplicó una multa del 10% (${moneda} ${multa}) por no cumplir el pago. Tenés 72 horas para presentar los fondos.`,
        'multa',
      );
    }

    const email = registro.cliente?.persona?.app?.email;
    if (email) {
      await emailService.sendFineNotification(email, multa, moneda);
    }

    return { ...updated, ...updated.app };
  },

  async markRetired(id: number, personaId: number) {
    const registro = await prisma.registroDeSubasta.findFirst({ where: { identificador: id, clienteId: personaId } });
    if (!registro) throw { status: 404, message: 'Compra no encontrada' };
    const updated = await prisma.registroDeSubasta.update({
      where: { identificador: id },
      data: { app: { update: { retiraPersonalmente: true } } },
      include: { app: true },
    });
    return { ...updated, ...updated.app };
  },

  async listAll(status?: string, skip = 0, take = 20) {
    const where = status ? { app: { status } } : {};
    const [purchases, total] = await Promise.all([
      prisma.registroDeSubasta.findMany({
        where,
        skip,
        take,
        include: {
          app: true,
          producto: { select: { identificador: true, descripcionCatalogo: true, app: { select: { numeroPieza: true, deposito: true, ubicacion: true } } } },
          cliente: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } } },
        },
        orderBy: { app: { createdAt: 'desc' } },
      }),
      prisma.registroDeSubasta.count({ where }),
    ]);
    // Resolver el medio de pago usado (paymentMethodId es un string, no una relación).
    const pmIds = [...new Set(purchases.map((p) => p.app?.paymentMethodId).filter((x): x is string => !!x))];
    const pms = pmIds.length
      ? await prisma.paymentMethod.findMany({ where: { id: { in: pmIds } }, select: { id: true, tipo: true, banco: true, moneda: true } })
      : [];
    const pmById = new Map(pms.map((m) => [m.id, m]));
    const mapped = purchases.map((p) => ({
      ...p,
      ...p.app,
      medioPago: p.app?.paymentMethodId ? pmById.get(p.app.paymentMethodId) ?? null : null,
      producto: {
        identificador: p.producto.identificador,
        descripcionCatalogo: p.producto.descripcionCatalogo,
        numeroPieza: p.producto.app?.numeroPieza ?? null,
        deposito: p.producto.app?.deposito ?? null,
        ubicacion: p.producto.app?.ubicacion ?? null,
      },
      cliente: { ...p.cliente, persona: flattenPersonaLite(p.cliente.persona) },
    }));
    return { purchases: mapped, total };
  },

  async checkExpiredFines() {
    const expired = await prisma.registroDeSubasta.findMany({
      where: { app: { status: 'multa_aplicada', pagoVencimientoAt: { lt: new Date() } } },
      select: { identificador: true, clienteId: true },
    });

    for (const registro of expired) {
      await prisma.registroDeSubasta.update({
        where: { identificador: registro.identificador },
        data: { app: { update: { status: 'derivado_justicia' } } },
      });

      if (registro.clienteId) {
        await prisma.personaApp.update({
          where: { personaId: registro.clienteId },
          data: { registrationStatus: 'bloqueado' },
        });
        await messageService.create(
          registro.clienteId,
          'Tu caso fue derivado a la justicia',
          'No cumpliste con el pago en el plazo estipulado. Tu cuenta ha sido bloqueada y el caso fue derivado a la justicia.',
          'multa',
        );
      }
    }

    return expired.length;
  },

  async markPaid(id: number) {
    const registro = await prisma.registroDeSubasta.findUnique({ where: { identificador: id } });
    if (!registro) throw { status: 404, message: 'Compra no encontrada' };
    const updated = await prisma.registroDeSubasta.update({
      where: { identificador: id },
      data: { app: { update: { status: 'pagado' } } },
      include: { app: true },
    });
    if (registro.clienteId) await categoryService.evaluateUpgrade(registro.clienteId);
    return { ...updated, ...updated.app };
  },
};
