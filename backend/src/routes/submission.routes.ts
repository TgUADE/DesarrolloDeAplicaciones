import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { verifyToken } from '../middlewares/auth';

const router = Router();

router.use(verifyToken);

router.post('/', submissionController.create);
router.get('/:id', submissionController.getById);
router.patch('/:id/accept-offer', submissionController.acceptOffer);
router.patch('/:id/reject-offer', submissionController.rejectOffer);
router.patch('/:id/shipped', submissionController.markShipped);
router.patch('/:id/accept-appraisal', submissionController.acceptAppraisal);
router.patch('/:id/reject-appraisal', submissionController.rejectAppraisal);

export default router;
