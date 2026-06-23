import { prisma } from '../config/prisma';
import { emailService } from './email.service';
import { messageService } from './message.service';
import { categoryService } from './category.service';
import { flattenProducto, flattenPersonaLite } from '../utils/flatten';
import { fromSiNo } from '../utils/siNo';

export const purchaseService = {
  async findById(id: number) {
    const r = await prisma.registroDeSubasta.findUnique({
      where: { identificador: id },
      include: {
        app: true,
        subasta: { select: { identificador: true, fecha: true, app: { select: { titulo: true } } } },
        producto: { include: { app: true, seguro: true, fotos: { take: 1, include: { app: true } } } },
        cliente: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } } },
      },
    });
    if (!r) return null;
    const medioPago = r.app?.paymentMethodId
      ? await prisma.paymentMethod.findUnique({
          where: { id: r.app.paymentMethodId },
          select: { tipo: true, banco: true, moneda: true, numeroCuenta: true, numeroTarjeta: true },
        })
      : null;
    const prod = flattenProducto(r.producto) as any;
    if (prod?.seguro) prod.seguro = { ...prod.seguro, polizaCombinada: fromSiNo(prod.seguro.polizaCombinada) };
    return {
      ...r,
      ...r.app,
      facturaNro: `FC-${String(r.identificador).padStart(6, '0')}`,
      trackingCode: `ENV-${String(r.identificador).padStart(6, '0')}`,
      subastaTitulo: r.subasta?.app?.titulo ?? null,
      subastaFecha: r.subasta?.fecha ?? null,
      medioPago,
      producto: prod,
      cliente: { ...r.cliente, persona: flattenPersonaLite(r.cliente.persona) },
    };
  },

  /** Factura imprimible en HTML (el navegador puede guardarla como PDF). */
  buildInvoiceHtml(p: any): string {
    const cur = p.moneda ?? 'ARS';
    const fmt = (n: any) => `${cur} ${Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    const importe = Number(p.importe ?? 0);
    const comision = Number(p.comision ?? 0);
    const envio = p.retiraPersonalmente ? 0 : Number(p.costoEnvio ?? 0);
    const multa = Number(p.multa ?? 0);
    const total = importe + comision + envio + multa;
    const cliente = p.cliente?.persona ? `${p.cliente.persona.nombre} ${p.cliente.persona.apellido ?? ''}`.trim() : '—';
    const pieza = p.producto?.descripcionCompleta || p.producto?.numeroPieza || `Pieza #${p.productoId}`;
    const fecha = p.createdAt ? new Date(p.createdAt).toLocaleString('es-AR') : '';
    const medio = p.medioPago ? `${p.medioPago.tipo} · ${p.medioPago.banco ?? ''} (${p.medioPago.moneda})` : 'A confirmar';
    const row = (l: string, v: string) => `<tr><td>${l}</td><td style="text-align:right">${v}</td></tr>`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ${p.facturaNro}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;margin:0;padding:24px;background:#f8f7f4}
  .doc{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px}
  h1{font-size:20px;margin:2px 0 2px}.muted{color:#6b7280;font-size:13px}
  .brand{color:#1d4e89;font-weight:800;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:14px}
  td{padding:7px 0;border-bottom:1px solid #f1f1f1}
  .total td{border-top:2px solid #111;border-bottom:none;padding-top:12px;font-size:16px;font-weight:700}
  .sec{margin-top:22px}.sec h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin:0 0 6px}
  .pill{display:inline-block;background:#eef2ff;color:#1d4e89;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600}
  @media print{body{background:#fff;padding:0}.doc{border:none}}
</style></head><body><div class="doc">
  <div class="brand">SUBASTAS</div>
  <h1>Factura ${p.facturaNro}</h1>
  <div class="muted">Emitida el ${fecha} · <span class="pill">${p.status ?? ''}</span></div>
  <div class="sec"><h2>Cliente</h2><div>${cliente}</div><div class="muted">${p.cliente?.persona?.email ?? ''}</div></div>
  <div class="sec"><h2>Pieza adquirida</h2><div>${pieza}</div><div class="muted">${p.subastaTitulo ? 'Subasta: ' + p.subastaTitulo : ''}${p.producto?.numeroPieza ? ' · ' + p.producto.numeroPieza : ''}</div></div>
  <div class="sec"><h2>Detalle de importe</h2><table>
    ${row('Oferta ganadora', fmt(importe))}
    ${row('Comisiones', fmt(comision))}
    ${row('Envío', p.retiraPersonalmente ? 'Retiro personal' : fmt(envio))}
    ${multa > 0 ? row('Multa', fmt(multa)) : ''}
    <tr class="total"><td>Total</td><td style="text-align:right">${fmt(total)}</td></tr>
  </table></div>
  <div class="sec"><h2>Medio de pago</h2><div>${medio}</div></div>
  <div class="sec"><h2>Envío / retiro</h2><div>${p.retiraPersonalmente ? 'Retiro personal en ' + (p.producto?.deposito ?? 'depósito') : 'Envío a domicilio'}</div>
    ${p.retiraPersonalmente ? '<div class="muted">Sin cobertura de seguro al retirar personalmente</div>' : `<div class="muted">Seguimiento: ${p.trackingCode}</div>`}</div>
  <div class="sec muted">Gracias por tu compra.</div>
</div></body></html>`;
  },

  /** Envía la factura por mail al comprador (usa Mailhog en desarrollo). */
  async sendInvoiceEmail(id: number) {
    const detail = await purchaseService.findById(id);
    if (!detail) throw { status: 404, message: 'Compra no encontrada' };
    const to = detail.cliente?.persona?.email;
    if (!to) throw { status: 400, message: 'El cliente no tiene email registrado' };
    await emailService.sendInvoice(to, detail.facturaNro, purchaseService.buildInvoiceHtml(detail));
    return { sent: true, to };
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
