import { Request, Response } from 'express';
import { itemService } from '../../services/item.service';
import { ok, serverError } from '../../utils/apiResponse';
import { prisma } from '../../config/prisma';
import { flattenProducto } from '../../utils/flatten';

export const adminItemController = {
  async upsertInsurance(req: Request, res: Response) {
    try {
      const { nroPoliza, compania, importe, polizaCombinada } = req.body;
      const seguro = await itemService.upsertInsurance(parseInt(req.params.id), { nroPoliza, compania, importe: Number(importe), polizaCombinada });
      return ok(res, seguro);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async upsertLocation(req: Request, res: Response) {
    try {
      const { deposito, ubicacion } = req.body;
      const loc = await itemService.upsertLocation(parseInt(req.params.id), { deposito, ubicacion });
      return ok(res, loc);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async list(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const where: any = {};
      if (status) where.app = { status: String(status) };
      // "disponible" para asignar = no está en ningún catálogo todavía.
      if (status === 'disponible') where.itemsCatalogo = { none: {} };
      const productos = await prisma.producto.findMany({
        where,
        include: {
          app: true,
          seguro: true,
          fotos: { take: 1, include: { app: true } },
          duenio: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } },
        },
        orderBy: { identificador: 'desc' },
        take: 100,
      });
      return ok(res, { items: productos.map(flattenProducto) });
    } catch (err: any) { return serverError(res, err.message); }
  },
};
