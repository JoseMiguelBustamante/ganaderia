import {
    createPurchaseService, registerPurchasePaymentService, getAllPurchasesService,
    getPurchaseByIdService, getPayablesSummaryService,
} from '../services/purchaseService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createPurchaseController = async (req, res) => {
    try {
        const { supplierId, description, totalAmount, purchasedAt, dueDate, itemId, quantity } = req.validated.body;
        const purchase = await createPurchaseService(req.user.tenantId, supplierId, description, totalAmount, purchasedAt, dueDate, itemId, quantity);
        return res.status(201).json({ data: purchase });
    } catch (error) {
        logger.error(`[purchaseController - createPurchaseController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const registerPurchasePaymentController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const { amount } = req.validated.body;
        const purchase = await registerPurchasePaymentService(req.user.tenantId, id, amount);
        return res.status(200).json({ data: purchase });
    } catch (error) {
        logger.error(`[purchaseController - registerPurchasePaymentController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllPurchasesController = async (req, res) => {
    try {
        const { status } = req.validated.query;
        return res.status(200).json({ data: await getAllPurchasesService(req.user.tenantId, status) });
    } catch (error) {
        logger.error(`[purchaseController - getAllPurchasesController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getPurchaseByIdController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        return res.status(200).json({ data: await getPurchaseByIdService(req.user.tenantId, id) });
    } catch (error) {
        logger.error(`[purchaseController - getPurchaseByIdController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getPayablesSummaryController = async (req, res) => {
    try {
        return res.status(200).json({ data: await getPayablesSummaryService(req.user.tenantId) });
    } catch (error) {
        logger.error(`[purchaseController - getPayablesSummaryController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
