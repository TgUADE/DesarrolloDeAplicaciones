import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { verifyToken } from '../middlewares/auth';
import { upload } from '../config/multer';

const router = Router();

router.use(verifyToken);

router.post('/', upload.array('images', 20), submissionController.create);
router.get('/:id', submissionController.getById);
router.patch('/:id/user-accept', submissionController.userAccept);
router.patch('/:id/user-reject', submissionController.userReject);

export default router;
