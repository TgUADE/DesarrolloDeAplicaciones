import { Request, Response } from 'express';
import { submissionService } from '../services/submission.service';
import { ok, created, notFound, forbidden, serverError } from '../utils/apiResponse';
import { saveBase64Image } from '../utils/saveBase64';

export const submissionController = {
  async create(req: Request, res: Response) {
    try {
      // Las imágenes llegan como base64 en JSON (el mobile no puede enviar FormData).
      const { nombre, descripcion, artista, fechaEpoca, datosHistoricos, cuentaCobro, moneda, declaracionPropiedad, origenLicito, precioSugerido, images } = req.body;
      const arr: string[] = Array.isArray(images) ? images : [];
      const imageUrls = arr.map((b64, i) => saveBase64Image(b64, `sub-${i}`));
      const submission = await submissionService.create(parseInt(req.user!.userId), {
        nombre,
        descripcion,
        artista,
        fechaEpoca,
        datosHistoricos,
        cuentaCobro,
        moneda,
        declaracionPropiedad: declaracionPropiedad === 'true' || declaracionPropiedad === true,
        origenLicito: origenLicito === 'true' || origenLicito === true,
        precioSugerido: precioSugerido != null && precioSugerido !== '' ? Number(precioSugerido) : undefined,
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
      const isOwner = sub.personaId?.toString() === req.user?.userId;
      const isAdmin = req.user?.isAdmin;
      if (!isOwner && !isAdmin) return forbidden(res);
      return ok(res, sub);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async listMine(req: Request, res: Response) {
    try {
      const result = await submissionService.listForUser(parseInt(req.params.id), req);
      return ok(res, result);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async userAccept(req: Request, res: Response) {
    try {
      const sub = await submissionService.userAccept(req.params.id, parseInt(req.user!.userId));
      return ok(res, sub);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async userReject(req: Request, res: Response) {
    try {
      const sub = await submissionService.userReject(req.params.id, parseInt(req.user!.userId));
      return ok(res, sub);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },
};
