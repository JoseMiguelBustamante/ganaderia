import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createSemenLot = async (tenantId, itemId, supplierId, lotCode, totalDoses, expiresAt) => {
    logger.startTimer('createSemenLot_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_SEMEN_LOT}($1,$2,$3,$4,$5,$6,$7)`,
            [tenantId, itemId, supplierId, lotCode, totalDoses, expiresAt, null],
        ));
        return result.rows[0].p_lot ?? result.rows[0];
    } catch (error) {
        logger.error(`[semenLotRepository - createSemenLot] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createSemenLot_repository');
    }
};

export const getAllSemenLots = async (tenantId) => {
    logger.startTimer('getAllSemenLots_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_ALL_SEMEN_LOTS}($1)`, [tenantId],
        ));
        return result.rows;
    } catch (error) {
        logger.error(`[semenLotRepository - getAllSemenLots] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllSemenLots_repository');
    }
};

export const getSemenLotById = async (tenantId, lotId) => {
    logger.startTimer('getSemenLotById_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_SEMEN_LOT_BY_ID}($1,$2)`, [tenantId, lotId],
        ));
        return result.rows[0] ?? null;
    } catch (error) {
        logger.error(`[semenLotRepository - getSemenLotById] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getSemenLotById_repository');
    }
};

export const consumeSemenLot = async (tenantId, lotId, doses, animalId) => {
    logger.startTimer('consumeSemenLot_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CONSUME_SEMEN_LOT}($1,$2,$3,$4,$5)`,
            [tenantId, lotId, doses, animalId, null],
        ));
        return result.rows[0].p_lot ?? result.rows[0];
    } catch (error) {
        logger.error(`[semenLotRepository - consumeSemenLot] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('consumeSemenLot_repository');
    }
};
