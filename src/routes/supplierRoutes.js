import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateQuery, validateParams } from '../middlewares/validateDto.js';
import {
    createSupplierDto,
    updateSupplierDto,
    listSuppliersQueryDto,
    supplierIdParamsDto,
} from '../dto/supplier.dto.js';
import {
    createSupplierController,
    getAllSuppliersController,
    getSupplierByIdController,
    updateSupplierController,
    deleteSupplierController,
} from '../controllers/supplierController.js';

const router = Router();

router.post('/', authenticate, validateBody(createSupplierDto), createSupplierController);
router.get('/', authenticate, validateQuery(listSuppliersQueryDto), getAllSuppliersController);
router.get('/:id', authenticate, validateParams(supplierIdParamsDto), getSupplierByIdController);
router.put('/:id',
    authenticate,
    validateParams(supplierIdParamsDto),
    validateBody(updateSupplierDto),
    updateSupplierController,
);
router.delete('/:id', authenticate, validateParams(supplierIdParamsDto), deleteSupplierController);

export default router;
