import { Request, Response } from 'express';
import { auctionService } from '../../services/auction.service';
import { ok, created, notFound, serverError } from '../../utils/apiResponse';
import { AuctionCategory, Currency } from '@prisma/client';

export const adminAuctionController = {
  async create(req: Request, res: Response) {
    try {
      const { titulo, descripcion, fechaHora, ubicacion, categoria, moneda, rematadorId, esColeccion, nombreColeccion } = req.body;
      const auction = await auctionService.create({
        titulo, descripcion, fechaHora: new Date(fechaHora),
        ubicacion, categoria: categoria as AuctionCategory,
        moneda: moneda as Currency, rematadorId, esColeccion, nombreColeccion,
      });
      return created(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async update(req: Request, res: Response) {
    try {
      const auction = await auctionService.update(req.params.id, req.body);
      return ok(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async setStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const auction = await auctionService.update(req.params.id, { status });
      return ok(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async start(req: Request, res: Response) {
    try {
      const auction = await auctionService.startAuction(req.params.id);
      return ok(res, auction);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async closeItem(req: Request, res: Response) {
    try {
      const result = await auctionService.closeItem(req.params.id);
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`auction:${req.params.id}`).emit('item:sold', {
          closedItemId: result.closedItemId,
          purchase: result.purchase,
        });
      }
      return ok(res, result);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async addItem(req: Request, res: Response) {
    try {
      const item = await auctionService.addItem(req.params.id, req.body.itemId);
      return ok(res, item);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
