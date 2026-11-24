import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validateDto.js';
import {
    createInventoryItemDto, updateInventoryItemDto, addStockDto, itemIdParamsDto, listInventoryQueryDto,
} from '../dto/inventory.dto.js';
import {
    createInventoryItemController, addStockController,
    getInventoryItemByIdController, getAllInventoryItemsController, getStockAlertsController,
    updateInventoryItemController, deleteInventoryItemController,
} from '../controllers/inventoryController.js';

const router = Router();

router.post('/', authenticate, validateBody(createInventoryItemDto), createInventoryItemController);
router.post('/:id/stock', authenticate, validateParams(itemIdParamsDto), validateBody(addStockDto), addStockController);
router.get('/alerts', authenticate, getStockAlertsController);
router.get('/:id', authenticate, validateParams(itemIdParamsDto), getInventoryItemByIdController);
router.put('/:id',
    authenticate, validateParams(itemIdParamsDto), validateBody(updateInventoryItemDto), updateInventoryItemController);
router.delete('/:id', authenticate, validateParams(itemIdParamsDto), deleteInventoryItemController);
router.get('/', authenticate, validateQuery(listInventoryQueryDto), getAllInventoryItemsController);

export default router;
