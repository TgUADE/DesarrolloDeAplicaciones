import { Router } from 'express';
import { adminUserController } from '../../controllers/admin/adminUser.controller';

const router = Router();

router.get('/users', adminUserController.list);
router.get('/payment-methods', adminUserController.listPaymentMethods);
router.get('/duenios', adminUserController.listDuenios);
router.patch('/duenios/:id/verify', adminUserController.verifyDuenio);
router.patch('/users/:id/approve', adminUserController.approveRegistration);
router.patch('/users/:id/category', adminUserController.setCategory);
router.patch('/users/:id/status', adminUserController.setStatus);
router.patch('/users/:id/payment-methods/:pmId/verify', adminUserController.verifyPaymentMethod);
router.get('/profile-change-requests', adminUserController.listProfileChangeRequests);
router.patch('/profile-change-requests/:id/approve', adminUserController.approveProfileChangeRequest);
router.patch('/profile-change-requests/:id/reject', adminUserController.rejectProfileChangeRequest);

export default router;
