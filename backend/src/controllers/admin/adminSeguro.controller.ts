import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ok, serverError } from '../../utils/apiResponse';

export const adminSeguroController = {
  async list(_req: Request, res: Response) {
    try {
      const seguros = await prisma.seguro.findMany({
        include: {
          app: { include: { duenio: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } } } },
          productos: {
            include: {
              app: { select: { numeroPieza: true, status: true, moneda: true } },
              duenio: { include: { persona: { select: { nombre: true, app: { select: { apellido: true } } } } } },
            },
          },
        },
        orderBy: { nroPoliza: 'asc' },
      });

      return ok(res, {
        seguros: seguros.map((s) => ({
          nroPoliza: s.nroPoliza,
          compania: s.compania,
          importe: Number(s.importe),
          polizaCombinada: s.polizaCombinada === 'si',
          duenioId: s.app?.duenioId ?? null,
          duenio: s.app?.duenio?.persona
            ? { id: s.app.duenio.persona.identificador, nombre: s.app.duenio.persona.nombre, apellido: s.app.duenio.persona.app?.apellido ?? '' }
            : null,
          productos: s.productos.map((p) => ({
            identificador: p.identificador,
            duenioId: p.duenioId,
            descripcionCompleta: p.descripcionCompleta,
            numeroPieza: p.app?.numeroPieza ?? null,
            status: p.app?.status ?? null,
            moneda: p.app?.moneda ?? null,
            duenio: p.duenio?.persona
              ? { nombre: p.duenio.persona.nombre, apellido: p.duenio.persona.app?.apellido ?? '' }
              : null,
          })),
        })),
      });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async create(req: Request, res: Response) {
    try {
      const { nroPoliza, compania, importe, polizaCombinada, duenioId } = req.body;
      if (!nroPoliza?.trim() || !compania?.trim() || importe == null) {
        return res.status(400).json({ success: false, error: 'nroPoliza, compania e importe son obligatorios' });
      }
      // Si se indica dueño, validar que exista (la póliza es por dueño).
      if (duenioId != null) {
        const d = await prisma.duenio.findUnique({ where: { identificador: Number(duenioId) } });
        if (!d) return res.status(400).json({ success: false, error: 'El dueño indicado no existe' });
      }
      const s = await prisma.seguro.create({
        data: {
          nroPoliza: String(nroPoliza).trim(),
          compania: String(compania).trim(),
          importe: Number(importe),
          polizaCombinada: polizaCombinada ? 'si' : 'no',
          ...(duenioId != null && { app: { create: { duenioId: Number(duenioId) } } }),
        },
      });
      return ok(res, s, 201);
    } catch (err: any) {
      if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Ya existe una póliza con ese número' });
      return serverError(res, err.message);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { compania, importe, polizaCombinada } = req.body;
      const s = await prisma.seguro.update({
        where: { nroPoliza: req.params.nroPoliza },
        data: {
          ...(compania != null && { compania: String(compania).trim() }),
          ...(importe != null && { importe: Number(importe) }),
          ...(polizaCombinada != null && { polizaCombinada: polizaCombinada ? 'si' : 'no' }),
        },
      });
      return ok(res, s);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async remove(req: Request, res: Response) {
    try {
      const count = await prisma.producto.count({ where: { nroPoliza: req.params.nroPoliza } });
      if (count > 0) {
        return res.status(409).json({ success: false, error: `No se puede eliminar: la póliza tiene ${count} producto(s) asignado(s)` });
      }
      await prisma.seguro.delete({ where: { nroPoliza: req.params.nroPoliza } });
      return ok(res, { deleted: true });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async assignProduct(req: Request, res: Response) {
    try {
      const nroPoliza = req.params.nroPoliza;
      const productoId = parseInt(req.params.productoId);
      const seguro = await prisma.seguro.findUnique({
        where: { nroPoliza },
        include: { app: { include: { duenio: { include: { persona: { include: { app: true } } } } } } },
      });
      if (!seguro) return res.status(404).json({ success: false, error: 'Póliza no encontrada' });

      const producto = await prisma.producto.findUnique({ where: { identificador: productoId } });
      if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

      // Una póliza es por dueño: el dueño se guarda en seguros_app. Si la póliza ya
      // tiene dueño, el producto debe ser del mismo; si no, el primer producto lo fija.
      if (seguro.app && seguro.app.duenioId !== producto.duenioId) {
        const d = seguro.app.duenio?.persona;
        const nombre = d ? `${d.nombre} ${d.app?.apellido ?? ''}`.trim() : `#${seguro.app.duenioId}`;
        return res.status(409).json({
          success: false,
          error: `La póliza es del dueño ${nombre}. No se pueden asignar productos de otro dueño.`,
        });
      }
      if (!seguro.app) {
        await prisma.seguroApp.create({ data: { nroPoliza, duenioId: producto.duenioId } });
      }

      await prisma.producto.update({ where: { identificador: productoId }, data: { nroPoliza } });

      const count = await prisma.producto.count({ where: { nroPoliza } });
      if (count > 1) {
        await prisma.seguro.update({ where: { nroPoliza }, data: { polizaCombinada: 'si' } });
      }
      return ok(res, { assigned: true });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async unassignProduct(req: Request, res: Response) {
    try {
      const nroPoliza = req.params.nroPoliza;
      const productoId = parseInt(req.params.productoId);
      await prisma.producto.update({ where: { identificador: productoId }, data: { nroPoliza: null } });

      const count = await prisma.producto.count({ where: { nroPoliza } });
      await prisma.seguro.update({ where: { nroPoliza }, data: { polizaCombinada: count <= 1 ? 'no' : 'si' } });
      return ok(res, { unassigned: true });
    } catch (err: any) { return serverError(res, err.message); }
  },
};
