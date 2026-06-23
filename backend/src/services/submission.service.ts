import { prisma } from '../config/prisma';
import { getPagination } from '../utils/pagination';
import { flattenPersonaLite } from '../utils/flatten';
import { getSystemEmpleadoId } from '../utils/systemEmpleado';
import { ensureSeguro } from './item.service';
import { Request } from 'express';

const personaLiteSelect = { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } as const;

// Dirección de la empresa donde el vendedor debe enviar el ítem para su inspección.
const DIRECCION_ENVIO_EMPRESA = 'Casa Central de Subastas — Av. Corrientes 1234, CABA (C1043). Lun a Vie 10 a 18 h.';

type SubWithImages = {
  id: string;
  personaId: number;
  nombre: string | null;
  descripcion: string;
  artista: string | null;
  fechaEpoca: string | null;
  datosHistoricos: string | null;
  moneda: string | null;
  images: { url: string; orden: number }[];
};

/**
 * Materializa un Producto a partir de una solicitud aceptada: asegura el Duenio,
 * copia las imágenes a Foto/FotoApp, autocrea el seguro y asigna depósito.
 * Idempotente (no duplica si el producto ya existe para esa solicitud).
 */
async function materializeProducto(sub: SubWithImages, base: number) {
  const yaCreado = await prisma.productoApp.findUnique({ where: { submissionId: sub.id } });
  if (yaCreado) return;
  const revisorId = await getSystemEmpleadoId();
  await prisma.duenio.upsert({
    where: { identificador: sub.personaId },
    create: { identificador: sub.personaId, verificadorId: revisorId },
    update: {},
  });
  const titulo = (sub.nombre?.trim() || sub.descripcion).slice(0, 300);
  const producto = await prisma.producto.create({
    data: {
      descripcionCompleta: titulo,
      descripcionCatalogo: sub.descripcion.slice(0, 500),
      disponible: 'si',
      duenioId: sub.personaId,
      revisorId,
      fotos: { create: sub.images.map((img) => ({ app: { create: { url: img.url, orden: img.orden } } })) },
      app: {
        create: {
          numeroPieza: `PIEZA-${sub.id.slice(0, 10).toUpperCase()}`,
          esObraDeArte: !!sub.artista?.trim(),
          artista: sub.artista?.trim() || undefined,
          fechaObra: sub.fechaEpoca?.trim() || undefined,
          historia: sub.datosHistoricos ?? undefined,
          status: 'disponible',
          moneda: sub.moneda ?? 'ARS',
          deposito: 'Depósito Central',
          ubicacion: 'Estante por asignar',
          submissionId: sub.id,
        },
      },
    },
  });
  if (base > 0.01) await ensureSeguro(producto.identificador, base, sub.personaId);
}

export const submissionService = {
  async create(
    personaId: number,
    data: {
      nombre?: string;
      descripcion: string;
      artista?: string;
      fechaEpoca?: string;
      datosHistoricos?: string;
      declaracionPropiedad: boolean;
      origenLicito: boolean;
      precioSugerido?: number;
      moneda?: string;
      cuentaCobro?: string;
      images: string[];
    },
  ) {
    if (data.images.length < 6) throw { status: 400, message: 'Se requieren al menos 6 imágenes' };
    if (data.moneda && !['ARS', 'USD'].includes(data.moneda)) throw { status: 400, message: 'Moneda inválida' };
    return prisma.itemSubmission.create({
      data: {
        personaId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        artista: data.artista,
        fechaEpoca: data.fechaEpoca,
        datosHistoricos: data.datosHistoricos,
        declaracionPropiedad: data.declaracionPropiedad,
        origenLicito: data.origenLicito,
        precioSugerido: data.precioSugerido != null ? data.precioSugerido : undefined,
        moneda: data.moneda,
        cuentaCobro: data.cuentaCobro,
        images: { create: data.images.map((url, orden) => ({ url, orden })) },
      },
      include: { images: true },
    });
  },

  async findById(id: string) {
    const sub = await prisma.itemSubmission.findUnique({
      where: { id },
      include: { images: { orderBy: { orden: 'asc' } }, persona: personaLiteSelect },
    });
    return sub ? { ...sub, persona: flattenPersonaLite(sub.persona) } : null;
  },

  async listForUser(personaId: number, req: Request) {
    const { skip, limit, page } = getPagination(req);
    const [rows, total] = await Promise.all([
      prisma.itemSubmission.findMany({
        where: { personaId },
        skip,
        take: limit,
        include: {
          images: { take: 1, orderBy: { orden: 'asc' } },
          _count: { select: { images: true } },
          // Estado real de la pieza materializada (para saber si ya está en una subasta).
          producto: {
            select: {
              status: true,
              producto: {
                select: { itemsCatalogo: { take: 1, select: { catalogo: { select: { subasta: { select: { estado: true } } } } } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemSubmission.count({ where: { personaId } }),
    ]);
    const submissions = rows.map((s) => {
      const { producto, ...rest } = s;
      return {
        ...rest,
        productoStatus: producto?.status ?? null,
        subastaEstado: producto?.producto?.itemsCatalogo?.[0]?.catalogo?.subasta?.estado ?? null,
      };
    });
    return { submissions, total, page };
  },

  async listAll(req: Request, status?: string) {
    const { skip, limit, page } = getPagination(req);
    const where = status ? { status } : {};
    const [submissions, total] = await Promise.all([
      prisma.itemSubmission.findMany({
        where,
        skip,
        take: limit,
        include: { images: { take: 1, orderBy: { orden: 'asc' } }, _count: { select: { images: true } }, persona: personaLiteSelect },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemSubmission.count({ where }),
    ]);
    return { submissions: submissions.map((s) => ({ ...s, persona: flattenPersonaLite(s.persona) })), total, page };
  },

  // === Flujo de venta (máquina de estados) ===
  // pendiente_empresa → oferta_inicial → por_enviar → enviado → recibido → tasacion_final → aceptada_usuario
  // Rechazos: rechazada_empresa (admin), rechazada_usuario (vendedor en oferta), rechazada_final (vendedor en tasación)

  /** [Admin] Ofrece un valor inicial e indica la dirección de envío. */
  async adminOffer(id: string, valorOfrecido: number, direccionEnvio?: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'pendiente_empresa') throw { status: 400, message: 'La solicitud no está en revisión' };
    if (!(valorOfrecido > 0)) throw { status: 400, message: 'El valor ofrecido debe ser mayor a cero' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'oferta_inicial', valorOfrecido, direccionEnvio: direccionEnvio?.trim() || DIRECCION_ENVIO_EMPRESA },
    });
  },

  /** [Admin] Rechaza la solicitud (antes del envío). */
  async adminReject(id: string, motivoRechazo: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (!['pendiente_empresa', 'oferta_inicial'].includes(sub.status)) throw { status: 400, message: 'Estado inválido para rechazar' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'rechazada_empresa', motivoRechazo } });
  },

  /** [Admin] Marca el ítem como recibido en el depósito. */
  async adminMarkReceived(id: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'enviado') throw { status: 400, message: 'El ítem todavía no fue enviado' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'recibido', recibidoAt: new Date() } });
  },

  /** [Admin] Tasación final + % de comisión (luego de inspeccionar). */
  async adminFinalAppraisal(id: string, precioBaseOfrecido: number, comisionPorcentaje: number, comisionesInfo?: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'recibido') throw { status: 400, message: 'El ítem debe estar recibido para tasarlo' };
    if (!(precioBaseOfrecido > 0)) throw { status: 400, message: 'El precio base debe ser mayor a cero' };
    if (!(comisionPorcentaje >= 0 && comisionPorcentaje <= 100)) throw { status: 400, message: 'La comisión debe estar entre 0 y 100%' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'tasacion_final', precioBaseOfrecido, comisionPorcentaje, comisionesInfo },
    });
  },

  /** [Vendedor] Acepta la oferta inicial → debe enviar el ítem. */
  async userAcceptOffer(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'oferta_inicial') throw { status: 400, message: 'No hay una oferta para aceptar' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'por_enviar' } });
  },

  /** [Vendedor] Rechaza la oferta inicial (fin). */
  async userRejectOffer(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'oferta_inicial') throw { status: 400, message: 'No hay una oferta para rechazar' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'rechazada_usuario' } });
  },

  /** [Vendedor] Confirma que envió el ítem. */
  async userMarkShipped(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'por_enviar') throw { status: 400, message: 'Estado inválido para marcar como enviado' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'enviado', enviadoAt: new Date() } });
  },

  /** [Vendedor] Acepta la tasación final → la pieza queda disponible para subasta. */
  async userAcceptAppraisal(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId }, include: { images: { orderBy: { orden: 'asc' } } } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'tasacion_final') throw { status: 400, message: 'No hay una tasación para aceptar' };
    const updated = await prisma.itemSubmission.update({ where: { id }, data: { status: 'aceptada_usuario' } });
    await materializeProducto(sub, Number(sub.precioBaseOfrecido ?? 0));
    return updated;
  },

  /** [Vendedor] Rechaza la tasación → se devuelve el ítem (envío a cargo del vendedor). */
  async userRejectAppraisal(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'tasacion_final') throw { status: 400, message: 'No hay una tasación para rechazar' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'rechazada_final', motivoRechazo: 'El vendedor rechazó la tasación final. Devolución con envío a su cargo.' },
    });
  },
};
