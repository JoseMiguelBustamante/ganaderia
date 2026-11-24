import { createTeamService, getAllTeamsService } from '../services/teamService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createTeamController = async (req, res) => {
    try {
        const { name } = req.validated.body;
        const team = await createTeamService(req.user.tenantId, name);
        return res.status(201).json({ data: team });
    } catch (error) {
        logger.error(`[teamController - createTeamController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllTeamsController = async (req, res) => {
    try {
        const teams = await getAllTeamsService(req.user.tenantId);
        return res.status(200).json({ data: teams });
    } catch (error) {
        logger.error(`[teamController - getAllTeamsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
