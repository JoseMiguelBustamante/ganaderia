import {
    createSupplierService,
    getAllSuppliersService,
    getSupplierByIdService,
    updateSupplierService,
    deleteSupplierService,
} from '../services/supplierService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createSupplierController = async (req, res) => {
    try {
        const supplier = await createSupplierService(req.user.tenantId, req.validated.body);
        return res.status(201).json({ data: supplier });
    } catch (error) {
        logger.error(`[supplierController - createSupplierController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllSuppliersController = async (req, res) => {
    try {
        const { activeOnly } = req.validated.query;
        const suppliers = await getAllSuppliersService(req.user.tenantId, activeOnly === 'true');
        return res.status(200).json({ data: suppliers });
    } catch (error) {
        logger.error(`[supplierController - getAllSuppliersController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getSupplierByIdController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const supplier = await getSupplierByIdService(req.user.tenantId, id);
        return res.status(200).json({ data: supplier });
    } catch (error) {
        logger.error(`[supplierController - getSupplierByIdController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const updateSupplierController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const supplier = await updateSupplierService(req.user.tenantId, id, req.validated.body);
        return res.status(200).json({ data: supplier });
    } catch (error) {
        logger.error(`[supplierController - updateSupplierController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const deleteSupplierController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const deleted = await deleteSupplierService(req.user.tenantId, id);
        return res.status(200).json({ data: deleted });
    } catch (error) {
        logger.error(`[supplierController - deleteSupplierController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
