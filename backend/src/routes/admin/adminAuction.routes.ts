import { Router } from 'express';
import { adminAuctionController } from '../../controllers/admin/adminAuction.controller';

const router = Router();

router.post('/auctions', adminAuctionController.create);
router.put('/auctions/:id', adminAuctionController.update);
router.patch('/auctions/:id/status', adminAuctionController.setStatus);
router.patch('/auctions/:id/items/:itemId/close', adminAuctionController.closeItem);
router.post('/auctions/:id/items', adminAuctionController.addItem);

export default router;
