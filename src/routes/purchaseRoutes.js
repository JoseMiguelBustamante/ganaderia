import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';
import { createPurchaseDto, registerPurchasePaymentDto, purchaseIdParamsDto, listPurchasesQueryDto } from '../dto/purchase.dto.js';
import {
    createPurchaseController, registerPurchasePaymentController, getAllPurchasesController,
    getPurchaseByIdController, getPayablesSummaryController,
} from '../controllers/purchaseController.js';

const router = Router();
router.post('/', authenticate, validateBody(createPurchaseDto), createPurchaseController);
router.get('/', authenticate, validateQuery(listPurchasesQueryDto), getAllPurchasesController);
router.get('/payables-summary', authenticate, getPayablesSummaryController);
router.get('/:id', authenticate, validateParams(purchaseIdParamsDto), getPurchaseByIdController);
router.post('/:id/payments', authenticate, validateParams(purchaseIdParamsDto), validateBody(registerPurchasePaymentDto), registerPurchasePaymentController);
export default router;
