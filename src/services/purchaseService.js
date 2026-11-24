import {
    createPurchase, registerPurchasePayment, getAllPurchases, getPurchaseById, getPayablesSummary,
} from '../repositories/purchaseRepository.js';
import { BusinessError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const businessReasons = new Set(['PAYMENT_EXCEEDS_TOTAL', 'PAYMENT_MUST_BE_POSITIVE', 'SUPPLIER_NOT_IN_TENANT', 'ITEM_NOT_IN_TENANT']);
const translatePurchaseError = (error) => {
    logger.error(`[purchaseService] Error: ${error.message}`);
    if (error.code === 'P0001') {
        if (error.message === 'PURCHASE_NOT_IN_TENANT') throw new NotFoundError({ reason: error.message });
        if (businessReasons.has(error.message)) throw new BusinessError({ reason: error.message });
    }
    throw error;
};

export const createPurchaseService = async (tenantId, supplierId, description, totalAmount, purchasedAt, dueDate, itemId, quantity) => {
    try {
        return await createPurchase(tenantId, supplierId, description, totalAmount, purchasedAt, dueDate, itemId, quantity);
    } catch (error) {
        translatePurchaseError(error);
    }
};

export const registerPurchasePaymentService = async (tenantId, purchaseId, amount) => {
    try {
        return await registerPurchasePayment(tenantId, purchaseId, amount);
    } catch (error) {
        translatePurchaseError(error);
    }
};

export const getAllPurchasesService = async (tenantId, status) => getAllPurchases(tenantId, status);
export const getPayablesSummaryService = async (tenantId) => getPayablesSummary(tenantId);
export const getPurchaseByIdService = async (tenantId, purchaseId) => {
    const purchase = await getPurchaseById(tenantId, purchaseId);
    if (!purchase) throw new NotFoundError();
    return purchase;
};
