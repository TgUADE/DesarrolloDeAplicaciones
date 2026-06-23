import { Router } from 'express';
import { adminPurchaseController } from '../../controllers/admin/adminPurchase.controller';
import { prisma } from '../../config/prisma';
import { ok, serverError } from '../../utils/apiResponse';

const router = Router();

router.get('/purchases', adminPurchaseController.list);
router.patch('/purchases/:id/fine', adminPurchaseController.applyFine);
router.patch('/purchases/:id/paid', adminPurchaseController.markPaid);
router.patch('/purchases/:id/shipped', adminPurchaseController.markShipped);
router.patch('/purchases/:id/delivered', adminPurchaseController.markDelivered);

// Subastadores (equivalente a auctioneers en el nuevo schema)
router.get('/auctioneers', async (_req, res) => {
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

router.post('/auctioneers', async (req, res) => {
  try {
    const { nombre, apellido, matricula, email, region } = req.body;
    const persona = await prisma.persona.create({ data: { nombre, documento: '', app: { create: { apellido, email } } } });
    const sub = await prisma.subastador.create({ data: { identificador: persona.identificador, matricula, region, app: { create: { email } } } });
    return res.status(201).json({ success: true, data: { id: sub.identificador.toString(), nombre, apellido, matricula, region } });
  } catch (err: any) { return serverError(res, err.message); }
});

router.put('/auctioneers/:id', async (req, res) => {
  try {
    const { matricula, region, activo, nombre, apellido } = req.body;
    const id = parseInt(req.params.id);
    if (nombre || apellido) await prisma.persona.update({ where: { identificador: id }, data: { nombre, app: { update: { apellido } } } });
    const sub = await prisma.subastador.update({ where: { identificador: id }, data: { matricula, region, app: { update: { activo } } } });
    return ok(res, sub);
  } catch (err: any) { return serverError(res, err.message); }
});

export default router;
