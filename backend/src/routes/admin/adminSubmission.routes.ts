import { Router } from 'express';
import { adminSubmissionController } from '../../controllers/admin/adminSubmission.controller';

const router = Router();

router.get('/submissions', adminSubmissionController.list);
router.patch('/submissions/:id/accept', adminSubmissionController.accept);
router.patch('/submissions/:id/reject', adminSubmissionController.reject);

export default router;
