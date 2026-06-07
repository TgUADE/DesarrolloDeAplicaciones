import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middlewares/auth';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import auctionRoutes from './auction.routes';
import itemRoutes from './item.routes';
import submissionRoutes from './submission.routes';
import auctioneerRoutes from './auctioneer.routes';
import purchaseRoutes from './purchase.routes';

import adminUserRoutes from './admin/adminUser.routes';
import adminAuctionRoutes from './admin/adminAuction.routes';
import adminSubmissionRoutes from './admin/adminSubmission.routes';
import adminItemRoutes from './admin/adminItem.routes';
import adminPurchaseRoutes from './admin/adminPurchase.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/auctions', auctionRoutes);
router.use('/items', itemRoutes);
router.use('/submissions', submissionRoutes);
router.use('/auctioneers', auctioneerRoutes);
router.use('/purchases', purchaseRoutes);

// Admin routes
router.use('/admin', verifyToken, requireAdmin, adminUserRoutes);
router.use('/admin', verifyToken, requireAdmin, adminAuctionRoutes);
router.use('/admin', verifyToken, requireAdmin, adminSubmissionRoutes);
router.use('/admin', verifyToken, requireAdmin, adminItemRoutes);
router.use('/admin', verifyToken, requireAdmin, adminPurchaseRoutes);

export default router;
