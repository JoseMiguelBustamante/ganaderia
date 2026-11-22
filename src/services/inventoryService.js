import {
    createInventoryItem, addStock, getInventoryItemById, getAllInventoryItems,
} from '../repositories/inventoryRepository.js';
import { BusinessError, ConflictError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const businessReasons = new Set(['ADD_STOCK_QTY_MUST_BE_POSITIVE', 'ITEM_NOT_IN_TENANT']);

export const createInventoryItemService = async (tenantId, name, category, unit, minStock) => {
    logger.startTimer('createInventoryItemService');
    try {
        return await createInventoryItem(tenantId, name, category, unit, minStock);
    } catch (error) {
        logger.error(`[inventoryService - createInventoryItemService] Error: ${error.message}`);
        if (error.code === '23505') throw new ConflictError({ reason: 'ITEM_NAME_ALREADY_EXISTS' });
        if (error.code === 'P0001' && businessReasons.has(error.message)) {
            throw new BusinessError({ reason: error.message });
        }
        throw error;
    } finally {
        logger.endTimer('createInventoryItemService');
    }
};

export const addStockService = async (tenantId, itemId, qty) => {
    logger.startTimer('addStockService');
    try {
        return await addStock(tenantId, itemId, qty);
    } catch (error) {
        logger.error(`[inventoryService - addStockService] Error: ${error.message}`);
        if (error.code === 'P0001' && businessReasons.has(error.message)) {
            throw new BusinessError({ reason: error.message });
        }
        throw error;
    } finally {
        logger.endTimer('addStockService');
    }
};

export const getInventoryItemByIdService = async (tenantId, itemId) => {
    logger.startTimer('getInventoryItemByIdService');
    try {
        const item = await getInventoryItemById(tenantId, itemId);
        if (!item) throw new NotFoundError();
        return item;
    } catch (error) {
        logger.error(`[inventoryService - getInventoryItemByIdService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getInventoryItemByIdService');
    }
};

export const getAllInventoryItemsService = async (tenantId) => {
    logger.startTimer('getAllInventoryItemsService');
    try {
        return await getAllInventoryItems(tenantId);
    } catch (error) {
        logger.error(`[inventoryService - getAllInventoryItemsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllInventoryItemsService');
    }
};
