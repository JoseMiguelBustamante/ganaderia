import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createSupplier = async (tenantId, name, contactName, phone, email) => {
    logger.startTimer('createSupplier_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_SUPPLIER}($1,$2,$3,$4,$5,$6)`,
            [tenantId, name, contactName, phone, email, null],
        ));
        return result.rows[0].p_supplier ?? result.rows[0];
    } catch (error) {
        logger.error(`[supplierRepository - createSupplier] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createSupplier_repository');
    }
};

export const getAllSuppliers = async (tenantId, activeOnly) => {
    logger.startTimer('getAllSuppliers_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_ALL_SUPPLIERS}($1,$2)`,
            [tenantId, activeOnly],
        ));
        return result.rows;
    } catch (error) {
        logger.error(`[supplierRepository - getAllSuppliers] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllSuppliers_repository');
    }
};

export const getSupplierById = async (tenantId, supplierId) => {
    logger.startTimer('getSupplierById_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_SUPPLIER_BY_ID}($1,$2)`,
            [tenantId, supplierId],
        ));
        return result.rows[0] ?? null;
    } catch (error) {
        logger.error(`[supplierRepository - getSupplierById] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getSupplierById_repository');
    }
};

export const updateSupplierById = async (tenantId, supplierId, contactName, phone, email) => {
    logger.startTimer('updateSupplierById_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_UPDATE_SUPPLIER}($1,$2,$3,$4,$5,$6)`,
            [tenantId, supplierId, contactName, phone, email, null],
        ));
        return result.rows[0].p_supplier ?? result.rows[0];
    } catch (error) {
        logger.error(`[supplierRepository - updateSupplierById] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('updateSupplierById_repository');
    }
};

export const deactivateSupplierById = async (tenantId, supplierId) => {
    logger.startTimer('deactivateSupplierById_repository');
    try {
        await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_DEACTIVATE_SUPPLIER}($1,$2,$3)`,
            [tenantId, supplierId, null],
        ));
    } catch (error) {
        logger.error(`[supplierRepository - deactivateSupplierById] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('deactivateSupplierById_repository');
    }
};
