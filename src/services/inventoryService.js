import {
    createInventoryItem, addStock, getInventoryItemById, getAllInventoryItems, getStockAlerts,
    updateInventoryItemById, deactivateInventoryItemById,
} from '../repositories/inventoryRepository.js';
import { BusinessError, ConflictError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const businessReasons = new Set(['ADD_STOCK_QTY_MUST_BE_POSITIVE', 'ITEM_NOT_IN_TENANT']);

export const createInventoryItemService = async (tenantId, name, category, unit, minStock, stage) => {
    logger.startTimer('createInventoryItemService');
    try {
        return await createInventoryItem(tenantId, name, category, unit, minStock, stage);
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
        return toPublicItem(item);
    } catch (error) {
        logger.error(`[inventoryService - getInventoryItemByIdService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getInventoryItemByIdService');
    }
};

export const updateInventoryItemService = async (tenantId, itemId, dto) => {
    logger.startTimer('updateInventoryItemService');
    try {
        const existing = await getInventoryItemById(tenantId, itemId);
        if (!existing) throw new NotFoundError();
        const { name, unit, minStock, stage } = dto;
        return await updateInventoryItemById(tenantId, itemId, name, unit, minStock, stage);
    } catch (error) {
        logger.error(`[inventoryService - updateInventoryItemService] Error: ${error.message}`);
        if (error.code === '23505') throw new ConflictError({ reason: 'ITEM_NAME_ALREADY_EXISTS' });
        if (error.code === 'P0001' && error.message === 'ITEM_NOT_IN_TENANT') throw new NotFoundError();
        throw error;
    } finally {
        logger.endTimer('updateInventoryItemService');
    }
};

export const deleteInventoryItemService = async (tenantId, itemId) => {
    logger.startTimer('deleteInventoryItemService');
    try {
        const existing = await getInventoryItemById(tenantId, itemId);
        if (!existing) throw new NotFoundError();
        await deactivateInventoryItemById(tenantId, itemId);
        return { id: itemId };
    } catch (error) {
        logger.error(`[inventoryService - deleteInventoryItemService] Error: ${error.message}`);
        if (error.code === 'P0001' && error.message === 'ITEM_NOT_IN_TENANT') throw new NotFoundError();
        throw error;
    } finally {
        logger.endTimer('deleteInventoryItemService');
    }
};

export const getAllInventoryItemsService = async (tenantId, stage) => {
    logger.startTimer('getAllInventoryItemsService');
    try {
        const items = await getAllInventoryItems(tenantId, stage);
        return items.map(toPublicItem);
    } catch (error) {
        logger.error(`[inventoryService - getAllInventoryItemsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllInventoryItemsService');
    }
};

export const getStockAlertsService = async (tenantId) => {
    logger.startTimer('getStockAlertsService');
    try {
        return await getStockAlerts(tenantId);
    } catch (error) {
        logger.error(`[inventoryService - getStockAlertsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getStockAlertsService');
    }
};

// Public API surface is camelCase end to end (writes already are, via the SP
// json payloads). Read rows come camel-cased here, matching authService.
function toPublicItem(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        stockQty: Number(row.stock_qty),
        minStock: Number(row.min_stock),
        isActive: row.is_active,
        stage: row.stage,
        createdAt: row.created_at,
    };
}
