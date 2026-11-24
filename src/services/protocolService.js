import {
    createProtocol, createBreedingProtocol, getAllProtocols, getProtocolStatus, completePhase, getPhaseExecutions,
} from '../repositories/protocolRepository.js';
import { BusinessError, ConflictError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const businessReasons = new Set([
    'PHASES_MUST_BE_UNIQUE_AND_ASCENDING_1_7', 'PROTOCOL_NOT_IN_TENANT',
    'ANIMAL_NOT_IN_TENANT', 'PHASE_NOT_FOUND', 'PHASE_OUT_OF_SEQUENCE',
    'PHASE_ALREADY_COMPLETED', 'INSUFFICIENT_STOCK', 'ITEM_NOT_IN_TENANT',
    'DOSES_MUST_BE_POSITIVE', 'PHASE_HAS_NO_REQUIRED_ITEM', 'ITEM_NOT_SEMEN',
    'LOT_NOT_IN_TENANT', 'LOT_DEPLETED', 'NOT_ENOUGH_DOSES', 'LOT_ITEM_MISMATCH',
    'TEAM_NOT_IN_TENANT',
]);

export const createProtocolService = async (tenantId, name, phases) => {
    logger.startTimer('createProtocolService');
    try {
        return await createProtocol(tenantId, name, JSON.stringify(phases));
    } catch (error) {
        logger.error(`[protocolService - createProtocolService] Error: ${error.message}`);
        if (error.code === '23505') throw new ConflictError({ reason: 'PROTOCOL_NAME_ALREADY_EXISTS' });
        if (error.code === 'P0001' && businessReasons.has(error.message)) {
            throw new BusinessError({ reason: error.message });
        }
        throw error;
    } finally {
        logger.endTimer('createProtocolService');
    }
};

export const createBreedingProtocolService = async (tenantId) => {
    logger.startTimer('createBreedingProtocolService');
    try {
        return await createBreedingProtocol(tenantId);
    } catch (error) {
        logger.error(`[protocolService - createBreedingProtocolService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createBreedingProtocolService');
    }
};

export const getAllProtocolsService = async (tenantId) => {
    logger.startTimer('getAllProtocolsService');
    try {
        return await getAllProtocols(tenantId);
    } catch (error) {
        logger.error(`[protocolService - getAllProtocolsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllProtocolsService');
    }
};

export const getProtocolStatusService = async (tenantId, animalId, protocolId) => {
    logger.startTimer('getProtocolStatusService');
    try {
        const status = await getProtocolStatus(tenantId, animalId, protocolId);
        // The SQL function resolves protocol and animal per tenant; a missing
        // or cross-tenant entity surfaces as null in the payload.
        if (!status || !status.protocol || !status.animal) throw new NotFoundError();
        return status;
    } catch (error) {
        logger.error(`[protocolService - getProtocolStatusService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getProtocolStatusService');
    }
};

export const executePhaseService = async (tenantId, animalId, dto, userId) => {
    logger.startTimer('executePhaseService');
    try {
        const { protocolId, phaseNumber, teamId, notes, semenLotId, doses } = dto;
        return await completePhase(
            tenantId, animalId, protocolId, phaseNumber, teamId, userId, notes, semenLotId, doses,
        );
    } catch (error) {
        logger.error(`[protocolService - executePhaseService] Error: ${error.message}`);
        if (error.code === 'P0001') {
            if (['LOT_NOT_IN_TENANT', 'PROTOCOL_NOT_IN_TENANT'].includes(error.message)) {
                throw new NotFoundError();
            }
            if (businessReasons.has(error.message)) {
                throw new BusinessError({ reason: error.message });
            }
        }
        throw error;
    } finally {
        logger.endTimer('executePhaseService');
    }
};

export const getPhaseExecutionsService = async (tenantId, animalId) => {
    logger.startTimer('getPhaseExecutionsService');
    try {
        const rows = await getPhaseExecutions(tenantId, animalId);
        if (rows.length === 0) throw new NotFoundError();
        return rows;
    } catch (error) {
        logger.error(`[protocolService - getPhaseExecutionsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getPhaseExecutionsService');
    }
};
