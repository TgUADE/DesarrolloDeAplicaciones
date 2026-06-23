import { Router } from 'express';
import { adminSubmissionController } from '../../controllers/admin/adminSubmission.controller';

const router = Router();

router.get('/submissions', adminSubmissionController.list);
router.patch('/submissions/:id/offer', adminSubmissionController.offer);
router.patch('/submissions/:id/received', adminSubmissionController.received);
router.patch('/submissions/:id/appraisal', adminSubmissionController.appraisal);
router.patch('/submissions/:id/reject', adminSubmissionController.reject);

export default router;
