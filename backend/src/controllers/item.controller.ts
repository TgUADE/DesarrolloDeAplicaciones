import { Request, Response } from 'express';
import { itemService } from '../services/item.service';
import { ok, notFound, forbidden, serverError } from '../utils/apiResponse';

export const itemController = {
  async getById(req: Request, res: Response) {
    try {
      const item = await itemService.findById(req.params.id, !!req.user);
      if (!item) return notFound(res);
      return ok(res, item);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getBids(req: Request, res: Response) {
    try {
      const result = await itemService.getBids(req.params.id);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getLocation(req: Request, res: Response) {
    try {
      const item = await itemService.findById(req.params.id, true) as any;
      if (!item) return notFound(res);
      const isOwner = item.currentOwnerId === req.user?.userId;
      const isAdmin = req.user?.isAdmin;
      if (!isOwner && !isAdmin) return forbidden(res);
      const loc = await itemService.getLocation(req.params.id);
      return ok(res, loc);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getInsurance(req: Request, res: Response) {
    try {
      const item = await itemService.findById(req.params.id, true) as any;
      if (!item) return notFound(res);
      const isOwner = item.currentOwnerId === req.user?.userId;
      const isAdmin = req.user?.isAdmin;
      if (!isOwner && !isAdmin) return forbidden(res);
      const insurance = await itemService.getInsurance(req.params.id);
      return ok(res, insurance);
    } catch (err: any) { return serverError(res, err.message); }
  },
};
