import { Router } from 'express';
import { adminCatalogController } from '../../controllers/admin/adminCatalog.controller';

const router = Router();

router.get('/catalogs', adminCatalogController.list);
router.post('/catalogs', adminCatalogController.create);
router.get('/catalogs/:id/items', adminCatalogController.getItems);
router.post('/catalogs/:id/items', adminCatalogController.addItem);
router.patch('/catalogs/:id/auction', adminCatalogController.assignToAuction);

export default router;
