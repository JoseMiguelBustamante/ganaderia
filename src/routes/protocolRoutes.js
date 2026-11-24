import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams } from '../middlewares/validateDto.js';
import { createProtocolDto, executePhaseDto, animalIdParamsDto } from '../dto/protocol.dto.js';
import {
    createProtocolController, createBreedingProtocolController, getAllProtocolsController,
    executePhaseController, getPhaseExecutionsController,
} from '../controllers/protocolController.js';

const router = Router();

router.post('/', authenticate, validateBody(createProtocolDto), createProtocolController);
router.post('/breeding', authenticate, createBreedingProtocolController);
router.get('/', authenticate, getAllProtocolsController);
router.post('/animals/:id/execute', authenticate, validateParams(animalIdParamsDto), validateBody(executePhaseDto), executePhaseController);
router.get('/animals/:id/executions', authenticate, validateParams(animalIdParamsDto), getPhaseExecutionsController);

export default router;
