import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody, validateQuery, validateParams } from '../middlewares/validateDto.js';
import { createAnimalDto, updateAnimalDto, listAnimalsQueryDto, animalIdParamsDto } from '../dto/animal.dto.js';
import {
    createAnimalController,
    getAllAnimalsController,
    getAnimalByIdController,
    updateAnimalController,
    deleteAnimalController,
} from '../controllers/animalController.js';

const router = Router();

router.post('/', authenticate, validateBody(createAnimalDto), createAnimalController);
router.get('/', authenticate, validateQuery(listAnimalsQueryDto), getAllAnimalsController);
router.get('/:id', authenticate, validateParams(animalIdParamsDto), getAnimalByIdController);
router.put('/:id',
    authenticate, validateParams(animalIdParamsDto), validateBody(updateAnimalDto), updateAnimalController);
router.delete('/:id', authenticate, validateParams(animalIdParamsDto), deleteAnimalController);

export default router;
