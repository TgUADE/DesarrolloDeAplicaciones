import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { upload } from '../config/multer';
import { verifyToken } from '../middlewares/auth';

const router = Router();

router.post('/register', upload.fields([{ name: 'docFrente', maxCount: 1 }, { name: 'docDorso', maxCount: 1 }]), authController.register);
router.post('/complete-registration', authController.completeRegistration);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.me);
router.post('/refresh', authController.refresh);

export default router;
