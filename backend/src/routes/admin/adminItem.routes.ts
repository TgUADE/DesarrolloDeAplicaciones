import { Router } from 'express';
import { adminItemController } from '../../controllers/admin/adminItem.controller';

const router = Router();

router.get('/items', adminItemController.list);
router.patch('/items/:id/insurance', adminItemController.upsertInsurance);
router.patch('/items/:id/location', adminItemController.upsertLocation);

export default router;
