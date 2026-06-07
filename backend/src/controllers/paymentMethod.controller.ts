import { Request, Response } from 'express';
import { paymentMethodService } from '../services/paymentMethod.service';
import { ok, created, forbidden, serverError } from '../utils/apiResponse';

function isSelf(req: Request, userId: string): boolean {
  return req.user?.userId === userId || req.user?.isAdmin === true;
}

export const paymentMethodController = {
  async list(req: Request, res: Response) {
    try {
      if (!isSelf(req, req.params.id)) return forbidden(res);
      const pms = await paymentMethodService.list(req.params.id);
      return ok(res, { paymentMethods: pms });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async create(req: Request, res: Response) {
    try {
      if (!isSelf(req, req.params.id)) return forbidden(res);
      const pm = await paymentMethodService.create(req.params.id, req.body);
      return created(res, pm);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      if (!isSelf(req, req.params.id)) return forbidden(res);
      const pm = await paymentMethodService.update(req.params.pmId, req.params.id, req.body);
      return ok(res, pm);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      if (!isSelf(req, req.params.id)) return forbidden(res);
      await paymentMethodService.remove(req.params.pmId, req.params.id);
      return ok(res, { message: 'Medio de pago eliminado' });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
