import { Request, Response } from 'express';
import { submissionService } from '../../services/submission.service';
import { ok, serverError } from '../../utils/apiResponse';

export const adminSubmissionController = {
  async list(req: Request, res: Response) {
    try {
      const result = await submissionService.listAll(req, req.query.status as string);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  // [Admin] Ofrece un valor inicial (+ dirección de envío) → el vendedor acepta/rechaza.
  async offer(req: Request, res: Response) {
    try {
      const { valorOfrecido, direccionEnvio } = req.body;
      const sub = await submissionService.adminOffer(req.params.id, Number(valorOfrecido), direccionEnvio);
      return ok(res, sub);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  // [Admin] Marca el ítem como recibido en el depósito.
  async received(req: Request, res: Response) {
    try {
      const sub = await submissionService.adminMarkReceived(req.params.id);
      return ok(res, sub);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  // [Admin] Tasación final + % de comisión.
  async appraisal(req: Request, res: Response) {
    try {
      const { precioBaseOfrecido, comisionPorcentaje, comisionesInfo } = req.body;
      const sub = await submissionService.adminFinalAppraisal(req.params.id, Number(precioBaseOfrecido), Number(comisionPorcentaje), comisionesInfo);
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
