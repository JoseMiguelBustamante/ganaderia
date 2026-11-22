import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams } from '../middlewares/validateDto.js';
import { createInventoryItemDto, addStockDto, itemIdParamsDto } from '../dto/inventory.dto.js';
import {
    createInventoryItemController, addStockController,
    getInventoryItemByIdController, getAllInventoryItemsController,
} from '../controllers/inventoryController.js';

const router = Router();

router.post('/', authenticate, validateBody(createInventoryItemDto), createInventoryItemController);
router.post('/:id/stock', authenticate, validateParams(itemIdParamsDto), validateBody(addStockDto), addStockController);
router.get('/:id', authenticate, validateParams(itemIdParamsDto), getInventoryItemByIdController);
router.get('/', authenticate, getAllInventoryItemsController);

export default router;
