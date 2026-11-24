import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams } from '../middlewares/validateDto.js';
import {
    createSemenLotDto,
    consumeSemenLotDto,
    semenLotIdParamsDto,
} from '../dto/semenLot.dto.js';
import {
    createSemenLotController,
    getAllSemenLotsController,
    getSemenLotByIdController,
    consumeSemenLotController,
} from '../controllers/semenLotController.js';

const router = Router();

router.post('/', authenticate, validateBody(createSemenLotDto), createSemenLotController);
router.get('/', authenticate, getAllSemenLotsController);
router.get('/:id', authenticate, validateParams(semenLotIdParamsDto), getSemenLotByIdController);
router.post('/:id/consume',
    authenticate,
    validateParams(semenLotIdParamsDto),
    validateBody(consumeSemenLotDto),
    consumeSemenLotController,
);

export default router;
