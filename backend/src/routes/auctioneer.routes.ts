import { Router } from 'express';
import { prisma } from '../config/prisma';
import { ok, serverError } from '../utils/apiResponse';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const auctioneers = await prisma.rematador.findMany({ where: { activo: true } });
    return ok(res, { auctioneers });
  } catch (err: any) { return serverError(res, err.message); }
});

export default router;
