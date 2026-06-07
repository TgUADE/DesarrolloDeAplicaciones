import { Request, Response } from 'express';
import { submissionService } from '../services/submission.service';
import { ok, created, notFound, forbidden, serverError } from '../utils/apiResponse';

export const submissionController = {
  async create(req: Request, res: Response) {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const imageUrls = files.map(f => `/uploads/submissions/${f.filename}`);
      const { declaracionPropiedad, origenLicito, ...rest } = req.body;
      const submission = await submissionService.create(req.user!.userId, {
        ...rest,
        declaracionPropiedad: declaracionPropiedad === 'true' || declaracionPropiedad === true,
        origenLicito: origenLicito === 'true' || origenLicito === true,
        images: imageUrls,
      });
      return created(res, submission);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const sub = await submissionService.findById(req.params.id);
      if (!sub) return notFound(res);
      const isOwner = sub.userId === req.user?.userId;
      const isAdmin = req.user?.isAdmin;
      if (!isOwner && !isAdmin) return forbidden(res);
      return ok(res, sub);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async listMine(req: Request, res: Response) {
    try {
      const result = await submissionService.listForUser(req.params.id, req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async userAccept(req: Request, res: Response) {
    try {
      const sub = await submissionService.userAccept(req.params.id, req.user!.userId);
      return ok(res, sub);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async userReject(req: Request, res: Response) {
    try {
      const sub = await submissionService.userReject(req.params.id, req.user!.userId);
      return ok(res, sub);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
