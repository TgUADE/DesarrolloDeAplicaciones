import { Response } from 'express';

export function ok<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function badRequest(res: Response, error: string) {
  return res.status(400).json({ success: false, error });
}

export function unauthorized(res: Response, error = 'No autorizado') {
  return res.status(401).json({ success: false, error });
}

export function forbidden(res: Response, error = 'Acceso denegado') {
  return res.status(403).json({ success: false, error });
}

export function notFound(res: Response, error = 'Recurso no encontrado') {
  return res.status(404).json({ success: false, error });
}

export function conflict(res: Response, error: string) {
  return res.status(409).json({ success: false, error });
}

export function unprocessable(res: Response, errors: unknown) {
  return res.status(422).json({ success: false, errors });
}

export function gone(res: Response, error: string) {
  return res.status(410).json({ success: false, error });
}

export function serverError(res: Response, error = 'Error interno del servidor') {
  return res.status(500).json({ success: false, error });
}
