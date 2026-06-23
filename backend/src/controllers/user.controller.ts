import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { profileChangeRequestService } from '../services/profileChangeRequest.service';
import { messageService } from '../services/message.service';
import { ok, created, notFound, forbidden, serverError } from '../utils/apiResponse';

function isSelfOrAdmin(req: Request, targetId: string): boolean {
  return req.user?.userId === targetId || req.user?.isAdmin === true;
}

export const userController = {
  async getById(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const user = await userService.findById(parseInt(req.params.id));
      if (!user) return notFound(res);
      return ok(res, user);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async update(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const user = await userService.update(parseInt(req.params.id), req.body);
      return ok(res, user);
    } catch (err: any) { return serverError(res, err.message); }
  },

  // El usuario SOLICITA un cambio de datos (queda pendiente de aprobación del admin).
  async createProfileChangeRequest(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const { nombre, apellido, domicilioLegal, cuentaCobro } = req.body;
      const reqCambio = await profileChangeRequestService.create(parseInt(req.params.id), { nombre, apellido, domicilioLegal, cuentaCobro });
      return created(res, reqCambio);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async listProfileChangeRequests(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const requests = await profileChangeRequestService.listForUser(parseInt(req.params.id));
      return ok(res, { requests });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getMetrics(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const metrics = await userService.getMetrics(parseInt(req.params.id));
      return ok(res, metrics);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getMessages(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const leido = req.query.leido !== undefined ? req.query.leido === 'true' : undefined;
      const result = await messageService.list(parseInt(req.params.id), leido);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async markMessageRead(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      await messageService.markRead(req.params.msgId, parseInt(req.params.id));
      return ok(res, { message: 'Mensaje marcado como leído' });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getAuctionHistory(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const result = await userService.getAuctionHistory(parseInt(req.params.id), req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getMyAuctions(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const result = await userService.getMyAuctions(parseInt(req.params.id));
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getPurchases(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const result = await userService.getPurchases(parseInt(req.params.id), req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getProducts(req: Request, res: Response) {
    try {
      if (!isSelfOrAdmin(req, req.params.id)) return forbidden(res);
      const result = await userService.getProducts(parseInt(req.params.id));
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },
};
