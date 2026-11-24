import {
    createInventoryItemService, addStockService, getInventoryItemByIdService,
    getAllInventoryItemsService, getStockAlertsService,
    updateInventoryItemService, deleteInventoryItemService,
} from '../services/inventoryService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createInventoryItemController = async (req, res) => {
    try {
        const { name, category, unit, minStock, stage } = req.validated.body;
        const item = await createInventoryItemService(req.user.tenantId, name, category, unit, minStock, stage);
        return res.status(201).json({ data: item });
    } catch (error) {
        logger.error(`[inventoryController - createInventoryItemController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const addStockController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const { qty } = req.validated.body;
        const item = await addStockService(req.user.tenantId, id, qty);
        return res.status(200).json({ data: item });
    } catch (error) {
        logger.error(`[inventoryController - addStockController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getInventoryItemByIdController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const item = await getInventoryItemByIdService(req.user.tenantId, id);
        return res.status(200).json({ data: item });
    } catch (error) {
        logger.error(`[inventoryController - getInventoryItemByIdController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getStockAlertsController = async (req, res) => {
    try {
        const alerts = await getStockAlertsService(req.user.tenantId);
        return res.status(200).json({ data: alerts });
    } catch (error) {
        logger.error(`[inventoryController - getStockAlertsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllInventoryItemsController = async (req, res) => {
    try {
        const { stage } = req.validated.query;
        const items = await getAllInventoryItemsService(req.user.tenantId, stage);
        return res.status(200).json({ data: items });
    } catch (error) {
        logger.error(`[inventoryController - getAllInventoryItemsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const updateInventoryItemController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const item = await updateInventoryItemService(req.user.tenantId, id, req.validated.body);
        return res.status(200).json({ data: item });
    } catch (error) {
        logger.error(`[inventoryController - updateInventoryItemController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const deleteInventoryItemController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const deleted = await deleteInventoryItemService(req.user.tenantId, id);
        return res.status(200).json({ data: deleted });
    } catch (error) {
        logger.error(`[inventoryController - deleteInventoryItemController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
