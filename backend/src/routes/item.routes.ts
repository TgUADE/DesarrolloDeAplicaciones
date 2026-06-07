import { Router } from 'express';
import { itemController } from '../controllers/item.controller';
import { verifyToken, optionalToken } from '../middlewares/auth';

const router = Router();

router.get('/:id', optionalToken, itemController.getById);
router.get('/:id/bids', itemController.getBids);
router.get('/:id/location', verifyToken, itemController.getLocation);
router.get('/:id/insurance', verifyToken, itemController.getInsurance);

export default router;
