import {
    createSemenLot,
    getAllSemenLots,
    getSemenLotById,
    consumeSemenLot,
} from '../repositories/semenLotRepository.js';
import { getInventoryItemById } from '../repositories/inventoryRepository.js';
import { BusinessError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const businessReasons = new Set([
    'ITEM_NOT_SEMEN',
    'DOSES_MUST_BE_POSITIVE',
    'NOT_ENOUGH_DOSES',
    'LOT_DEPLETED',
]);

function toPublicLot(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        itemId: row.item_id,
        supplierId: row.supplier_id,
        lotCode: row.lot_code,
        totalDoses: row.total_doses,
        availableDoses: row.available_doses,
        expiresAt: row.expires_at,
        status: row.status,
    };
}

export const createSemenLotService = async (tenantId, dto) => {
    logger.startTimer('createSemenLotService');
    try {
        const { itemId, supplierId, lotCode, totalDoses, expiresAt } = dto;
        const item = await getInventoryItemById(tenantId, itemId);
        if (!item) throw new NotFoundError();
        return await createSemenLot(tenantId, itemId, supplierId, lotCode, totalDoses, expiresAt);
    } catch (error) {
        logger.error(`[semenLotService - createSemenLotService] Error: ${error.message}`);
        if (error.code === '23505') {
            throw new BusinessError({ reason: 'LOT_CODE_ALREADY_EXISTS' });
        }
        if (error.code === 'P0001' && businessReasons.has(error.message)) {
            throw new BusinessError({ reason: error.message });
        }
        throw error;
    } finally {
        logger.endTimer('createSemenLotService');
    }
};

export const getAllSemenLotsService = async (tenantId) => {
    logger.startTimer('getAllSemenLotsService');
    try {
        const lots = await getAllSemenLots(tenantId);
        return lots.map(toPublicLot);
    } catch (error) {
        logger.error(`[semenLotService - getAllSemenLotsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllSemenLotsService');
    }
};

export const getSemenLotByIdService = async (tenantId, id) => {
    logger.startTimer('getSemenLotByIdService');
    try {
        const lot = await getSemenLotById(tenantId, id);
        if (!lot) throw new NotFoundError();
        return toPublicLot(lot);
    } catch (error) {
        logger.error(`[semenLotService - getSemenLotByIdService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getSemenLotByIdService');
    }
};

export const consumeSemenLotService = async (tenantId, id, dto) => {
    logger.startTimer('consumeSemenLotService');
    try {
        const { doses, animalId } = dto;
        return await consumeSemenLot(tenantId, id, doses, animalId);
    } catch (error) {
        logger.error(`[semenLotService - consumeSemenLotService] Error: ${error.message}`);
        if (error.code === 'P0001' && error.message === 'LOT_NOT_IN_TENANT') {
            throw new NotFoundError();
        }
        if (error.code === 'P0001' && businessReasons.has(error.message)) {
            throw new BusinessError({ reason: error.message });
        }
        throw error;
    } finally {
        logger.endTimer('consumeSemenLotService');
    }
};
