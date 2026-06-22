import { Request, Response } from 'express';
import { auctionService } from '../../services/auction.service';
import { ok, created, serverError } from '../../utils/apiResponse';

export const adminAuctionController = {
  async create(req: Request, res: Response) {
    try {
      const { titulo, descripcion, fechaHora, ubicacion, categoria, moneda, rematadorId, esColeccion, nombreColeccion } = req.body;
      const auction = await auctionService.create({ titulo, descripcion, fechaHora: new Date(fechaHora), ubicacion, categoria, moneda, rematadorId, esColeccion, nombreColeccion });
      return created(res, auction);
    } catch (err: any) { return res.status(err.status || 500).json({ success: false, error: err.message }); }
  },

  async update(req: Request, res: Response) {
    try {
      const auction = await auctionService.update(parseInt(req.params.id), req.body);
      return ok(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async setStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const auction = await auctionService.update(parseInt(req.params.id), { status });
      return ok(res, auction);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async start(req: Request, res: Response) {
    try {
      const auction = await auctionService.startAuction(parseInt(req.params.id));
      return ok(res, auction);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async closeItem(req: Request, res: Response) {
    try {
      const result = await auctionService.closeItem(parseInt(req.params.id));
      const io = (req.app as any).get('io');
      if (io) {
        io.to(`auction:${req.params.id}`).emit('item:sold', {
          closedItemId: result.closedItemId,
          winnerId: result.purchase?.clienteId ?? null,
          nextItemId: result.nextItemId ?? null,
        });
      }
      return ok(res, result);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async addItem(req: Request, res: Response) {
    try {
      const item = await auctionService.addItem(parseInt(req.params.id), parseInt(req.body.itemId), req.body.precioBase, req.body.comision);
      return ok(res, item);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },
};
