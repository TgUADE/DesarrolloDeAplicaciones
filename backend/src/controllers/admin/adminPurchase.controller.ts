import { Request, Response } from 'express';
import { purchaseService } from '../../services/purchase.service';
import { ok, serverError } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';

export const adminPurchaseController = {
  async list(req: Request, res: Response) {
    try {
      const { skip, limit, page } = getPagination(req);
      const result = await purchaseService.listAll(req.query.status as string, skip, limit);
      return ok(res, { ...result, page });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async applyFine(req: Request, res: Response) {
    try {
      const purchase = await purchaseService.applyFine(req.params.id);
      return ok(res, purchase);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async markPaid(req: Request, res: Response) {
    try {
      const purchase = await purchaseService.markPaid(req.params.id);
      return ok(res, purchase);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
