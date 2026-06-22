import { Router } from 'express';
import { prisma } from '../config/prisma';
import { ok, serverError } from '../utils/apiResponse';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const subastadores = await prisma.subastador.findMany({
      where: { app: { activo: true } },
      include: { app: true, persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } },
    });
    const mapped = subastadores.map((s) => ({
      id: s.identificador.toString(),
      nombre: s.persona.nombre,
      apellido: s.persona.app?.apellido ?? '',
      matricula: s.matricula,
      region: s.region,
      activo: s.app?.activo ?? false,
    }));
    return ok(res, { auctioneers: mapped });
  } catch (err: any) { return serverError(res, err.message); }
});

export default router;
