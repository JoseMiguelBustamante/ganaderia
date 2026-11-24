import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createTeam = async (tenantId, name) => {
    logger.startTimer('createTeam_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_TEAM}($1,$2,$3)`, [tenantId, name, null],
        ));
        return result.rows[0].p_team ?? result.rows[0];
    } catch (error) {
        logger.error(`[teamRepository - createTeam] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createTeam_repository');
    }
};

export const getAllTeams = async (tenantId) => {
    logger.startTimer('getAllTeams_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_ALL_TEAMS}($1)`, [tenantId],
        ));
        return result.rows;
    } catch (error) {
        logger.error(`[teamRepository - getAllTeams] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllTeams_repository');
    }
};
