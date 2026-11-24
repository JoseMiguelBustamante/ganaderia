import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createInventoryItem = async (tenantId, name, category, unit, minStock, stage) => {
    logger.startTimer('createInventoryItem_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_INVENTORY_ITEM}($1,$2,$3,$4,$5,$6,$7)`,
            [tenantId, name, category, unit, minStock, stage, null],
        ));
        return result.rows[0].p_item;
    } catch (error) {
        logger.error(`[inventoryRepository - createInventoryItem] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createInventoryItem_repository');
    }
};

export const addStock = async (tenantId, itemId, qty) => {
    logger.startTimer('addStock_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_ADD_STOCK}($1,$2,$3,$4)`, [tenantId, itemId, qty, null],
        ));
        return result.rows[0].p_item;
    } catch (error) {
        logger.error(`[inventoryRepository - addStock] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('addStock_repository');
    }
};

export const getInventoryItemById = async (tenantId, itemId) => {
    logger.startTimer('getInventoryItemById_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_INVENTORY_ITEM_BY_ID}($1,$2)`, [tenantId, itemId],
        ));
        return result.rows[0] ?? null;
    } catch (error) {
        logger.error(`[inventoryRepository - getInventoryItemById] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getInventoryItemById_repository');
    }
};

export const getAllInventoryItems = async (tenantId, stage) => {
    logger.startTimer('getAllInventoryItems_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_ALL_INVENTORY_ITEMS}($1,$2)`, [tenantId, stage],
        ));
        return result.rows;
    } catch (error) {
        logger.error(`[inventoryRepository - getAllInventoryItems] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllInventoryItems_repository');
    }
};

export const getStockAlerts = async (tenantId) => {
    logger.startTimer('getStockAlerts_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT ${constants.FN_GET_STOCK_ALERTS}($1) AS alerts`, [tenantId],
        ));
        return result.rows[0].alerts;
    } catch (error) {
        logger.error(`[inventoryRepository - getStockAlerts] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getStockAlerts_repository');
    }
};
