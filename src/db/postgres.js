import pg from 'pg';
import { env } from '../config/env.js';

// Runtime pool: connects as the least-privileged application role, so Row Level
// Security is always enforced (the role has NOBYPASSRLS). Locally that is the
// ganaderia_app role created by migration 001.
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

// Admin pool: owner connection for system bootstrap and cross-tenant reads
// (table owner bypasses RLS). Migrations use it too, separately.
const adminPool = env.ADMIN_DATABASE_URL
    ? new pg.Pool({ connectionString: env.ADMIN_DATABASE_URL, max: 2 })
    : null;

export const executeQuery = async (text, params = []) => {
    const result = await pool.query(text, params);
    return result.rows;
};

export const executeStoreProcedure = async (name, params = []) => {
    const placeholders = params.map((_, index) => `$${index + 1}`).join(', ');
    const result = await pool.query(`CALL ${name}(${placeholders})`, params);
    return result.rows;
};

// System-scoped procedure: same CALL convention, on the admin (owner) pool, for
// onboarding writes that cross tenants under RLS. Name must be a bare ident (it
// always comes from constants.js).
export const executeSystemProcedure = async (name, params = []) => {
    if (!adminPool) {
        throw new Error('ADMIN_DATABASE_URL is not configured: no system connection available');
    }
    if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
        throw new Error(`unsafe procedure name: ${name}`);
    }
    const placeholders = params.map((_, index) => `$${index + 1}`).join(', ');
    return withSystem(async (client) => {
        const result = await client.query(`CALL ${name}(${placeholders})`, params);
        return result.rows;
    });
};

// Runs `executor(client)` inside a transaction with app.current_tenant set
// locally, so every statement sees exactly one tenant through RLS. Repositories
// pass the tenant explicitly (S3); the GUC makes the isolation real in SQL.
export const withTenant = async (tenantId, executor) => {
    if (!tenantId) {
        throw new Error('withTenant requires a tenant id');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config(\'app.current_tenant\', $1, true)', [tenantId]);
        const output = await executor(client);
        await client.query('COMMIT');
        return output;
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* connection already broken */ }
        throw error;
    } finally {
        client.release();
    }
};

// Runs `executor(client)` on the admin (owner) connection, bypassing RLS.
// Only for system bootstrap: first tenant/user provisioning and public lookups
// that must cross tenants (e.g. resolving a tenant slug at login).
export const withSystem = async (executor) => {
    if (!adminPool) {
        throw new Error('ADMIN_DATABASE_URL is not configured: no system connection available');
    }
    const client = await adminPool.connect();
    try {
        return await executor(client);
    } finally {
        client.release();
    }
};
