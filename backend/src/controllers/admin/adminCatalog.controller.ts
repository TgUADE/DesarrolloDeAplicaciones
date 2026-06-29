import { Request, Response } from 'express';
import { catalogService } from '../../services/catalog.service';
import { created, ok } from '../../utils/apiResponse';

export const adminCatalogController = {
  async list(req: Request, res: Response) {
    try {
      const { status, subastaId } = req.query;
      const result = await catalogService.list({
        status: status as string | undefined,
        subastaId: subastaId ? Number(subastaId) : undefined,
      });
      return ok(res, result);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const catalog = await catalogService.create({
        descripcion: req.body.descripcion,
        responsableId: req.body.responsableId ? Number(req.body.responsableId) : undefined,
      });
      return created(res, catalog);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async getItems(req: Request, res: Response) {
    try {
      const items = await catalogService.getItems(Number(req.params.id), true);
      return ok(res, { items });
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async addItem(req: Request, res: Response) {
    try {
      const item = await catalogService.addItem(
        Number(req.params.id),
        Number(req.body.itemId),
        Number(req.body.precioBase),
        Number(req.body.comision),
      );
      return created(res, item);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async assignToAuction(req: Request, res: Response) {
    try {
      const catalog = await catalogService.assignToAuction(Number(req.params.id), Number(req.body.subastaId));
      return ok(res, catalog);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },
};
