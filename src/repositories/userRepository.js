import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';

export const createUser = async (tenantId, email, passwordHash, displayName, role, teamId) =>
    withTenant(tenantId, async (client) => {
        const result = await client.query(`CALL ${constants.SP_CREATE_USER}($1, $2, $3, $4, $5, $6)`,
            [tenantId, email, passwordHash, displayName, role, teamId]);
        return result.rows[0].p_user;
    });

export const getAllUsers = async (tenantId, includeInactive) =>
    withTenant(tenantId, async (client) => {
        const result = await client.query(`SELECT * FROM ${constants.FN_GET_ALL_USERS}($1, $2)`, [tenantId, includeInactive]);
        return result.rows;
    });

export const deactivateUser = async (tenantId, userId) =>
    withTenant(tenantId, async (client) => {
        const result = await client.query(`CALL ${constants.SP_DEACTIVATE_USER}($1, $2)`, [tenantId, userId]);
        return result.rows[0].p_id;
    });

export const changeUserPassword = async (tenantId, userId, passwordHash) =>
    withTenant(tenantId, async (client) => {
        const result = await client.query(`CALL ${constants.SP_CHANGE_USER_PASSWORD}($1, $2, $3)`, [tenantId, userId, passwordHash]);
        return result.rows[0].p_id;
    });
