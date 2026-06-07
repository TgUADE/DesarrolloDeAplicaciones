import { Router } from 'express';
import { purchaseService } from '../services/purchase.service';
import { verifyToken } from '../middlewares/auth';
import { ok, notFound, forbidden, serverError } from '../utils/apiResponse';

const router = Router();

router.use(verifyToken);

router.get('/:id', async (req, res) => {
  try {
    const purchase = await purchaseService.findById(req.params.id);
    if (!purchase) return notFound(res);
    const isOwner = purchase.buyerId === req.user?.userId;
    if (!isOwner && !req.user?.isAdmin) return forbidden(res);
    return ok(res, purchase);
  } catch (err: any) { return serverError(res, err.message); }
});

router.patch('/:id/retire', async (req, res) => {
  try {
    const purchase = await purchaseService.markRetired(req.params.id, req.user!.userId);
    return ok(res, purchase);
  } catch (err: any) {
    const status = (err as any).status || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
