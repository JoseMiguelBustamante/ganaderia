import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { loginDto, registerDto } from '../dto/auth.dto.js';
import {
    getMeController,
    loginController,
    registerController,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', validateBody(registerDto), registerController);
router.post('/login', validateBody(loginDto), loginController);
router.get('/me', authenticate, getMeController);

export default router;
