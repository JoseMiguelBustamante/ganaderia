import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createProtocol = async (tenantId, name, phasesJson) => {
    logger.startTimer('createProtocol_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_PROTOCOL}($1,$2,$3,$4)`, [tenantId, name, phasesJson, null],
        ));
        return result.rows[0].p_protocol;
    } catch (error) {
        logger.error(`[protocolRepository - createProtocol] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createProtocol_repository');
    }
};

export const completePhase = async (tenantId, animalId, protocolId, phaseNumber, teamId, userId, notes) => {
    logger.startTimer('completePhase_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_COMPLETE_PHASE}($1,$2,$3,$4,$5,$6,$7,$8)`,
            [tenantId, animalId, protocolId, phaseNumber, teamId, userId, notes, null],
        ));
        return result.rows[0].p_execution;
    } catch (error) {
        logger.error(`[protocolRepository - completePhase] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('completePhase_repository');
    }
};

export const getPhaseExecutions = async (tenantId, animalId) => {
    logger.startTimer('getPhaseExecutions_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_PHASE_EXECUTIONS}($1,$2)`, [tenantId, animalId],
        ));
        return result.rows;
    } catch (error) {
        logger.error(`[protocolRepository - getPhaseExecutions] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getPhaseExecutions_repository');
    }
};
