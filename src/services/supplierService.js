import {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplierById,
    deactivateSupplierById,
} from '../repositories/supplierRepository.js';
import { ConflictError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

const toPublicSupplier = (row) => ({
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    isActive: row.is_active,
});

export const createSupplierService = async (tenantId, dto) => {
    logger.startTimer('createSupplierService');
    try {
        const { name, contactName, phone, email } = dto;
        return await createSupplier(tenantId, name, contactName, phone, email);
    } catch (error) {
        logger.error(`[supplierService - createSupplierService] Error: ${error.message}`);
        if (error.code === '23505') {
            throw new ConflictError({ reason: 'SUPPLIER_NAME_ALREADY_EXISTS' });
        }
        throw error;
    } finally {
        logger.endTimer('createSupplierService');
    }
};

export const getAllSuppliersService = async (tenantId, activeOnly) => {
    logger.startTimer('getAllSuppliersService');
    try {
        const suppliers = await getAllSuppliers(tenantId, activeOnly);
        return suppliers.map(toPublicSupplier);
    } catch (error) {
        logger.error(`[supplierService - getAllSuppliersService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllSuppliersService');
    }
};

export const getSupplierByIdService = async (tenantId, id) => {
    logger.startTimer('getSupplierByIdService');
    try {
        const supplier = await getSupplierById(tenantId, id);
        if (!supplier) throw new NotFoundError();
        return toPublicSupplier(supplier);
    } catch (error) {
        logger.error(`[supplierService - getSupplierByIdService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getSupplierByIdService');
    }
};

export const updateSupplierService = async (tenantId, id, dto) => {
    logger.startTimer('updateSupplierService');
    try {
        const existing = await getSupplierById(tenantId, id);
        if (!existing || !existing.is_active) throw new NotFoundError();
        const { contactName, phone, email } = dto;
        return await updateSupplierById(tenantId, id, contactName, phone, email);
    } catch (error) {
        logger.error(`[supplierService - updateSupplierService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('updateSupplierService');
    }
};

export const deleteSupplierService = async (tenantId, id) => {
    logger.startTimer('deleteSupplierService');
    try {
        const existing = await getSupplierById(tenantId, id);
        if (!existing || !existing.is_active) throw new NotFoundError();
        await deactivateSupplierById(tenantId, id);
        return { id };
    } catch (error) {
        logger.error(`[supplierService - deleteSupplierService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('deleteSupplierService');
    }
};
