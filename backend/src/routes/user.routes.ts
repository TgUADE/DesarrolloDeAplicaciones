import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { paymentMethodController } from '../controllers/paymentMethod.controller';
import { submissionController } from '../controllers/submission.controller';
import { verifyToken } from '../middlewares/auth';

const router = Router();

router.use(verifyToken);

router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.get('/:id/metrics', userController.getMetrics);
router.get('/:id/messages', userController.getMessages);
router.put('/:id/messages/:msgId/read', userController.markMessageRead);
router.get('/:id/auction-history', userController.getAuctionHistory);
router.get('/:id/my-auctions', userController.getMyAuctions);
router.get('/:id/purchases', userController.getPurchases);
router.get('/:id/submissions', submissionController.listMine);

// Payment methods nested under user
router.get('/:id/payment-methods', paymentMethodController.list);
router.post('/:id/payment-methods', paymentMethodController.create);
router.put('/:id/payment-methods/:pmId', paymentMethodController.update);
router.delete('/:id/payment-methods/:pmId', paymentMethodController.remove);

export default router;
