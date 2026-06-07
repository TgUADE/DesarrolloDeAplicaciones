import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { messageService } from '../services/message.service';
import { ok, notFound, forbidden, serverError } from '../utils/apiResponse';

function isSelfOrAdmin(req: Request, targetId: string): boolean {
  return req.user?.userId === targetId || req.user?.isAdmin === true;
}

export const userController = {
  async getById(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const user = await userService.findById(req.params.id);
      if (!user) return notFound(res);
      return ok(res, user);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async update(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const user = await userService.update(req.params.id, req.body);
      return ok(res, user);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getMetrics(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const metrics = await userService.getMetrics(req.params.id);
      return ok(res, metrics);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getMessages(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const leido = req.query.leido !== undefined ? req.query.leido === 'true' : undefined;
      const result = await messageService.list(req.params.id, leido);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async markMessageRead(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      await messageService.markRead(req.params.msgId, req.params.id);
      return ok(res, { message: 'Mensaje marcado como leído' });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getAuctionHistory(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const result = await userService.getAuctionHistory(req.params.id, req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getPurchases(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const result = await userService.getPurchases(req.params.id, req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },
};
