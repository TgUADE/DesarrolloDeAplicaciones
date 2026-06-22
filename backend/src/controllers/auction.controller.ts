import { Request, Response } from 'express';
import { auctionService } from '../services/auction.service';
import { ok, notFound, serverError } from '../utils/apiResponse';

export const auctionController = {
  async list(req: Request, res: Response) {
    try {
      const { status, categoria, moneda, search } = req.query;
      const result = await auctionService.list(req, { status: status as string, categoria: categoria as string, moneda: moneda as string, search: search as string }, req.user?.userId);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getById(req: Request, res: Response) {
    try {
      const auction = await auctionService.findById(parseInt(req.params.id));
      if (!auction) return notFound(res);
      return ok(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getCatalog(req: Request, res: Response) {
    try {
      const showPrices = !!req.user;
      const items = await auctionService.getCatalog(parseInt(req.params.id), showPrices);
      return ok(res, { items });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getCurrentItem(req: Request, res: Response) {
    try {
      const data = await auctionService.getCurrentItem(parseInt(req.params.id));
      return ok(res, data);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getBids(req: Request, res: Response) {
    try {
      const result = await auctionService.getBids(parseInt(req.params.id), req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getParticipants(req: Request, res: Response) {
    try {
      const participants = await auctionService.getParticipants(parseInt(req.params.id));
      return ok(res, { participants });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async join(req: Request, res: Response) {
    try {
      const result = await auctionService.join(parseInt(req.params.id), req.user!.userId);
      return ok(res, result);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async leave(req: Request, res: Response) {
    try {
      await auctionService.leave(parseInt(req.params.id), req.user!.userId);
      return ok(res, { message: 'Desconectado de la subasta' });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async placeBid(req: Request, res: Response) {
    try {
      const { monto, paymentMethodId } = req.body;
      const result = await auctionService.placeBid(parseInt(req.params.id), req.user!.userId, paymentMethodId, Number(monto));
      const io = (req.app as any).get('io');
      if (io) io.to(`auction:${req.params.id}`).emit('bid:new', { puja: result.puja, mejorOferta: result.mejorOferta, endsAt: result.endsAt });
      return ok(res, { puja: result.puja, mejorOferta: result.mejorOferta, endsAt: result.endsAt }, 201);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async favorite(req: Request, res: Response) {
    try {
      await auctionService.addFavorite(parseInt(req.params.id), req.user!.userId);
      return ok(res, { followed: true });
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async unfavorite(req: Request, res: Response) {
    try {
      await auctionService.removeFavorite(parseInt(req.params.id), req.user!.userId);
      return ok(res, { followed: false });
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async startItem(req: Request, res: Response) {
    try {
      const result = await auctionService.startItem(parseInt(req.params.id), parseInt(req.params.itemId), req.user!);
      const io = (req.app as any).get('io');
      if (io) io.to(`auction:${req.params.id}`).emit('auction:item-changed', { item: result.item, endsAt: result.endsAt });
      return ok(res, result);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },
};
