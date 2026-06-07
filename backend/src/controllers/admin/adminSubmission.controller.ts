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

  async accept(req: Request, res: Response) {
    try {
      const { precioBaseOfrecido, comisionesInfo } = req.body;
      const sub = await submissionService.adminAccept(req.params.id, Number(precioBaseOfrecido), comisionesInfo);
      return ok(res, sub);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
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
