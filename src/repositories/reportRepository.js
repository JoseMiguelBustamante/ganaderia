import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';

export const getAnimalCosts = async (tenantId, animalId) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT ${constants.FN_GET_ANIMAL_COSTS}($1,$2) AS costs`, [tenantId, animalId],
    ));
    return result.rows[0].costs;
};

export const getStageCosts = async (tenantId) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT ${constants.FN_GET_STAGE_COSTS}($1) AS costs`, [tenantId],
    ));
    return result.rows[0].costs;
};

export const getReportsSummary = async (tenantId, from, to) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT ${constants.FN_GET_REPORTS_SUMMARY}($1,$2,$3) AS summary`, [tenantId, from, to],
    ));
    return result.rows[0].summary;
};

export const getPurchasesForExport = async (tenantId, from, to) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT * FROM ${constants.FN_GET_PURCHASES_FOR_EXPORT}($1,$2,$3)`, [tenantId, from, to],
    ));
    return result.rows;
};

export const getMovementsForExport = async (tenantId, from, to) => {
    const result = await withTenant(tenantId, (client) => client.query(
        `SELECT * FROM ${constants.FN_GET_MOVEMENTS_FOR_EXPORT}($1,$2,$3)`, [tenantId, from, to],
    ));
    return result.rows;
};
