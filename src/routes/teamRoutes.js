import { Router } from 'ultimate-express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { createTeamDto } from '../dto/team.dto.js';
import { createTeamController, getAllTeamsController } from '../controllers/teamController.js';

const router = Router();

router.post('/', authenticate, validateBody(createTeamDto), createTeamController);
router.get('/', authenticate, getAllTeamsController);

export default router;
