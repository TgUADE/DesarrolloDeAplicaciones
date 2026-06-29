import { Request, Response } from 'express';
import { submissionService } from '../../services/submission.service';
import { ok, serverError } from '../../utils/apiResponse';

function parseEstimatedAuctionDate(value: unknown): Date {
  if (typeof value !== 'string') return new Date(Number.NaN);
  const normalized = value.trim();
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(normalized)) return new Date(normalized + 'T12:00:00');
  return new Date(normalized);
}

export const adminSubmissionController = {
  async list(req: Request, res: Response) {
    try {
      const result = await submissionService.listAll(req, req.query.status as string);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  // [Admin] Envía propuesta completa → el vendedor acepta y envía el bien, o rechaza.
  async offer(req: Request, res: Response) {
    try {
      const { valorOfrecido, precioBaseOfrecido, comisionPorcentaje, fechaSubastaEstimada, comisionesInfo, direccionEnvio } = req.body;
      const sub = await submissionService.adminOffer(
        req.params.id,
        Number(precioBaseOfrecido ?? valorOfrecido),
        Number(comisionPorcentaje),
        parseEstimatedAuctionDate(fechaSubastaEstimada),
        comisionesInfo,
        direccionEnvio,
      );
      return ok(res, sub);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  // [Admin] Marca el ítem como recibido en el depósito.
  async received(req: Request, res: Response) {
    try {
      const { deposito, ubicacion } = req.body;
      const sub = await submissionService.adminMarkReceived(req.params.id, { deposito, ubicacion });
      return ok(res, sub);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async reject(req: Request, res: Response) {
    try {
      const { motivoRechazo } = req.body;
      const sub = await submissionService.adminReject(req.params.id, motivoRechazo);
      return ok(res, sub);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
