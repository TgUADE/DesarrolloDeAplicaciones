import { Router } from 'express';
import { purchaseService } from '../services/purchase.service';
import { verifyToken, optionalToken } from '../middlewares/auth';
import { verifyAccessToken } from '../utils/jwt';
import { ok, notFound, forbidden, serverError } from '../utils/apiResponse';

const router = Router();

/**
 * Factura imprimible (HTML — el navegador puede guardarla como PDF).
 * Acepta el token por header Bearer o por query `?token=` para poder abrirla
 * directamente en el navegador del celular.
 */
router.get('/:id/invoice', optionalToken, async (req, res) => {
  try {
    let user = req.user;
    if (!user && typeof req.query.token === 'string') {
      try {
        user = verifyAccessToken(req.query.token);
      } catch {
        /* token inválido */
      }
    }
    if (!user) return res.status(401).send('No autorizado');
    const purchase = await purchaseService.findById(parseInt(req.params.id));
    if (!purchase) return res.status(404).send('Compra no encontrada');
    if (purchase.clienteId?.toString() !== user.userId && !user.isAdmin) return res.status(403).send('Prohibido');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(purchaseService.buildInvoiceHtml(purchase));
  } catch (err: any) {
    return res.status(500).send(err.message);
  }
});

router.use(verifyToken);

router.get('/:id', async (req, res) => {
  try {
    const purchase = await purchaseService.findById(parseInt(req.params.id));
    if (!purchase) return notFound(res);
    const isOwner = purchase.clienteId?.toString() === req.user?.userId;
    if (!isOwner && !req.user?.isAdmin) return forbidden(res);
    return ok(res, purchase);
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

router.patch('/:id/retire', async (req, res) => {
  try {
    const purchase = await purchaseService.markRetired(parseInt(req.params.id), parseInt(req.user!.userId));
    return ok(res, purchase);
  } catch (err: any) {
    const status = (err as any).status || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
});

router.post('/:id/send-invoice', async (req, res) => {
  try {
    const purchase = await purchaseService.findById(parseInt(req.params.id));
    if (!purchase) return notFound(res);
    const isOwner = purchase.clienteId?.toString() === req.user?.userId;
    if (!isOwner && !req.user?.isAdmin) return forbidden(res);
    const result = await purchaseService.sendInvoiceEmail(parseInt(req.params.id));
    return ok(res, result);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
