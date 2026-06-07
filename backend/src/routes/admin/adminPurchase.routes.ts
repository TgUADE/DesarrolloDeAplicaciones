import { Router } from 'express';
import { adminPurchaseController } from '../../controllers/admin/adminPurchase.controller';
import { prisma } from '../../config/prisma';
import { ok, serverError } from '../../utils/apiResponse';

const router = Router();

router.get('/purchases', adminPurchaseController.list);
router.patch('/purchases/:id/fine', adminPurchaseController.applyFine);
router.patch('/purchases/:id/paid', adminPurchaseController.markPaid);

// Auctioneers admin
router.get('/auctioneers', async (_req, res) => {
  try {
    const auctioneers = await prisma.rematador.findMany();
    return ok(res, { auctioneers });
  } catch (err: any) { return serverError(res, err.message); }
});

router.post('/auctioneers', async (req, res) => {
  try {
    const { nombre, apellido, matricula, email } = req.body;
    const a = await prisma.rematador.create({ data: { nombre, apellido, matricula, email } });
    return res.status(201).json({ success: true, data: a });
  } catch (err: any) { return serverError(res, err.message); }
});

router.put('/auctioneers/:id', async (req, res) => {
  try {
    const a = await prisma.rematador.update({ where: { id: req.params.id }, data: req.body });
    return ok(res, a);
  } catch (err: any) { return serverError(res, err.message); }
});

export default router;
