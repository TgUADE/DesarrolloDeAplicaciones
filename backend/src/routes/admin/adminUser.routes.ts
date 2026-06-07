import { Router } from 'express';
import { adminUserController } from '../../controllers/admin/adminUser.controller';

const router = Router();

router.get('/users', adminUserController.list);
router.patch('/users/:id/category', adminUserController.setCategory);
router.patch('/users/:id/status', adminUserController.setStatus);
router.patch('/users/:id/payment-methods/:pmId/verify', adminUserController.verifyPaymentMethod);

export default router;
