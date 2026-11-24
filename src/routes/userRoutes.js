import { Router } from 'ultimate-express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { validateBody, validateParams } from '../middlewares/validateDto.js';
import { createUserDto, userIdParamsDto, changeUserPasswordDto } from '../dto/user.dto.js';
import { createUserController, getAllUsersController, deactivateUserController, changeUserPasswordController } from '../controllers/userController.js';

const router = Router();
router.post('/', authenticate, authorize('owner', 'manager'), validateBody(createUserDto), createUserController);
router.get('/', authenticate, authorize('owner', 'manager'), getAllUsersController);
router.delete('/:id', authenticate, authorize('owner', 'manager'), validateParams(userIdParamsDto), deactivateUserController);
// Legacy roles keep access to their own password without gaining staff administration.
router.post('/:id/password', authenticate, authorize('owner', 'manager', 'operator', 'vet', 'admin', 'field', 'purchasing'),
    validateParams(userIdParamsDto), validateBody(changeUserPasswordDto), changeUserPasswordController);
export default router;
