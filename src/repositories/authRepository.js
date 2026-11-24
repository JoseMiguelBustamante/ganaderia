import { withSystem, withTenant, executeSystemProcedure } from '../db/postgres.js';
import { constants } from '../config/constants.js';

// System connection (owner, RLS bypassed): only tenant onboarding and login
// resolution cross tenants, per the auth module contract. Everything else runs
// inside withTenant. All SQL lives in stored functions/procedures here.
export const createTenantWithOwner = async (name, slug, email, passwordHash, displayName) => {
    return executeSystemProcedure(constants.SP_CREATE_TENANT_WITH_OWNER, [
        name,
        slug,
        email,
        passwordHash,
        displayName,
    ]);
};

export const getTenantBySlug = async (slug) => {
    return withSystem(async (client) => {
        const result = await client.query(`SELECT * FROM ${constants.FN_GET_TENANT_BY_SLUG}($1)`, [slug]);
        return result.rows[0] ?? null;
    });
};

export const getLoginContextByEmail = async (email) => {
    return withSystem(async (client) => {
        const result = await client.query(
            `SELECT * FROM ${constants.FN_GET_LOGIN_CONTEXT_BY_EMAIL}($1)`, [email],
        );
        // Camel-cased session shape straight from the resolver row.
        const row = result.rows[0] ?? null;
        if (!row) return null;
        return {
            tenant: {
                id: row.tenant_id, name: row.tenant_name, slug: row.tenant_slug,
                planStatus: row.plan_status,
            },
            user: {
                id: row.user_id, tenantId: row.tenant_id, email: row.email,
                passwordHash: row.password_hash, displayName: row.display_name,
                role: row.role, teamId: row.team_id,
            },
        };
    });
};

export const getUserByTenantAndEmail = async (tenantId, email) => {
    return withSystem(async (client) => {
        const result = await client.query(
            `SELECT * FROM ${constants.FN_GET_USER_BY_TENANT_AND_EMAIL}($1, $2)`,
            [tenantId, email],
        );
        return result.rows[0] ?? null;
    });
};

export const getUserById = async (tenantId, userId) => {
    return withTenant(tenantId, async (client) => {
        const result = await client.query(`SELECT * FROM ${constants.FN_GET_USER_BY_ID}($1)`, [userId]);
        return result.rows[0] ?? null;
    });
};
