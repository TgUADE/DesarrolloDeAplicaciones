import { Router } from 'express';
import { adminSeguroController } from '../../controllers/admin/adminSeguro.controller';

const router = Router();

router.get('/seguros/aumentos', adminSeguroController.listRequests);
router.patch('/seguros/aumentos/:id/approve', adminSeguroController.approveRequest);
router.patch('/seguros/aumentos/:id/reject', adminSeguroController.rejectRequest);

router.get('/seguros', adminSeguroController.list);
router.post('/seguros', adminSeguroController.create);
router.patch('/seguros/:nroPoliza', adminSeguroController.update);
router.delete('/seguros/:nroPoliza', adminSeguroController.remove);
router.patch('/seguros/:nroPoliza/productos/:productoId', adminSeguroController.assignProduct);
router.delete('/seguros/:nroPoliza/productos/:productoId', adminSeguroController.unassignProduct);

export default router;
