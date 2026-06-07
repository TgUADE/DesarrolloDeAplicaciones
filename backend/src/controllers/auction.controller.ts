import { Request, Response } from 'express';
import { auctionService } from '../services/auction.service';
import { ok, notFound, serverError } from '../utils/apiResponse';
import { AuctionCategory, AuctionStatus, Currency } from '@prisma/client';

export const auctionController = {
  async list(req: Request, res: Response) {
    try {
      const { status, categoria, moneda } = req.query;
      const result = await auctionService.list(req, {
        status: status as AuctionStatus,
        categoria: categoria as AuctionCategory,
        moneda: moneda as Currency,
      });
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getById(req: Request, res: Response) {
    try {
      const auction = await auctionService.findById(req.params.id);
      if (!auction) return notFound(res);
      return ok(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getCatalog(req: Request, res: Response) {
    try {
      const showPrices = !!req.user;
      const items = await auctionService.getCatalog(req.params.id, showPrices);
      return ok(res, { items });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getCurrentItem(req: Request, res: Response) {
    try {
      const data = await auctionService.getCurrentItem(req.params.id);
      return ok(res, data);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getBids(req: Request, res: Response) {
    try {
      const result = await auctionService.getBids(req.params.id, req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async getParticipants(req: Request, res: Response) {
    try {
      const participants = await auctionService.getParticipants(req.params.id);
      return ok(res, { participants });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async join(req: Request, res: Response) {
    try {
      const result = await auctionService.join(req.params.id, req.user!.userId);
      return ok(res, result);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async leave(req: Request, res: Response) {
    try {
      await auctionService.leave(req.params.id, req.user!.userId);
      return ok(res, { message: 'Desconectado de la subasta' });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async placeBid(req: Request, res: Response) {
    try {
      const { monto, paymentMethodId } = req.body;
      const result = await auctionService.placeBid(req.params.id, req.user!.userId, paymentMethodId, Number(monto));
      // Emit via socket (accessed from app globals)
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`auction:${req.params.id}`).emit('bid:new', {
          puja: result.puja,
          mejorOferta: result.mejorOferta,
        });
      }
      return ok(res, { puja: result.puja, mejorOferta: result.mejorOferta }, 201);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
