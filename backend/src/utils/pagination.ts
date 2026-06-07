import { Request } from 'express';

export function getPagination(req: Request, defaultLimit = 20) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || defaultLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
