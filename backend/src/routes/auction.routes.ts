import { Router } from 'express';
import { auctionController } from '../controllers/auction.controller';
import { verifyToken, optionalToken } from '../middlewares/auth';

const router = Router();

router.get('/', optionalToken, auctionController.list);
router.get('/:id', auctionController.getById);
router.get('/:id/catalog', optionalToken, auctionController.getCatalog);
router.get('/:id/current-item', verifyToken, auctionController.getCurrentItem);
router.get('/:id/bids', verifyToken, auctionController.getBids);
router.get('/:id/participants', verifyToken, auctionController.getParticipants);
router.post('/:id/join', verifyToken, auctionController.join);
router.delete('/:id/leave', verifyToken, auctionController.leave);
router.post('/:id/bids', verifyToken, auctionController.placeBid);
router.post('/:id/favorite', verifyToken, auctionController.favorite);
router.delete('/:id/favorite', verifyToken, auctionController.unfavorite);
router.post('/:id/items/:itemId/start', verifyToken, auctionController.startItem);

export default router;
