import { createTeam, getAllTeams } from '../repositories/teamRepository.js';
import { ConflictError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const toPublicTeam = (row) => ({
    id: row.id,
    name: row.name,
    isActive: row.is_active,
});

export const createTeamService = async (tenantId, name) => {
    logger.startTimer('createTeamService');
    try {
        return await createTeam(tenantId, name);
    } catch (error) {
        logger.error(`[teamService - createTeamService] Error: ${error.message}`);
        if (error.code === '23505') throw new ConflictError({ reason: 'TEAM_NAME_ALREADY_EXISTS' });
        throw error;
    } finally {
        logger.endTimer('createTeamService');
    }
};

export const getAllTeamsService = async (tenantId) => {
    logger.startTimer('getAllTeamsService');
    try {
        const teams = await getAllTeams(tenantId);
        return teams.map(toPublicTeam);
    } catch (error) {
        logger.error(`[teamService - getAllTeamsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllTeamsService');
    }
};
