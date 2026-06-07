import { Request, Response } from 'express';
import { itemService } from '../../services/item.service';
import { ok, serverError } from '../../utils/apiResponse';
import { prisma } from '../../config/prisma';

export const adminItemController = {
  async upsertInsurance(req: Request, res: Response) {
    try {
      const { polizaNumero, valorAsegurado, proveedor, beneficiarioId, vencimiento, contacto, polizaGrupoId } = req.body;
      const seguro = await itemService.upsertInsurance(req.params.id, {
        polizaNumero, valorAsegurado: Number(valorAsegurado), proveedor, beneficiarioId,
        vencimiento: vencimiento ? new Date(vencimiento) : undefined,
        contacto, polizaGrupoId,
      });
      return ok(res, seguro);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async upsertLocation(req: Request, res: Response) {
    try {
      const { deposito, sector, notas } = req.body;
      const loc = await itemService.upsertLocation(req.params.id, { deposito, sector, notas });
      return ok(res, loc);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async list(req: Request, res: Response) {
    try {
      const items = await prisma.item.findMany({
        include: { images: { take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return ok(res, { items });
    } catch (err: any) { return serverError(res, err.message); }
  },
};
