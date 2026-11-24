import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createPurchase = async (tenantId, supplierId, description, totalAmount, purchasedAt, dueDate, itemId, quantity) => {
    logger.startTimer('createPurchase_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_PURCHASE}($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [tenantId, supplierId, description, totalAmount, purchasedAt, dueDate, itemId, quantity, null],
        ));
        return result.rows[0].p_purchase;
    } catch (error) {
        logger.error(`[purchaseRepository - createPurchase] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createPurchase_repository');
    }
};

export const registerPurchasePayment = async (tenantId, purchaseId, amount) => {
    logger.startTimer('registerPurchasePayment_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_REGISTER_PURCHASE_PAYMENT}($1,$2,$3,$4)`, [tenantId, purchaseId, amount, null],
        ));
        return result.rows[0].p_purchase;
    } catch (error) {
        logger.error(`[purchaseRepository - registerPurchasePayment] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('registerPurchasePayment_repository');
    }
};

export const getAllPurchases = async (tenantId, status) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT ${constants.FN_GET_ALL_PURCHASES}($1,$2) AS purchases`, [tenantId, status],
    ));
    return result.rows[0].purchases;
};

export const getPurchaseById = async (tenantId, purchaseId) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT ${constants.FN_GET_PURCHASE_BY_ID}($1,$2) AS purchase`, [tenantId, purchaseId],
    ));
    return result.rows[0].purchase;
};

export const getPayablesSummary = async (tenantId) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT ${constants.FN_GET_PAYABLES_SUMMARY}($1) AS summary`, [tenantId],
    ));
    return result.rows[0].summary;
};
