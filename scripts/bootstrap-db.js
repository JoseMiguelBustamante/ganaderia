#!/usr/bin/env node
// Production self-bootstrap, run as the admin connection BEFORE migrations:
// 1. ensures the runtime role exists and its password matches DATABASE_URL
//    (the panel value is the single source of truth: change DATABASE_URL,
//    redeploy, and the role is rotated in the same boot),
// 2. ensures the application database exists,
// 3. grants the runtime role connect rights.
// Dev/test clusters are created by scripts/db.js, so this is a no-op there.
import pg from 'pg';

const ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;
const APP_ROLE = 'ganaderia_app';
const APP_DB = 'ganaderia';

if (!ADMIN_DATABASE_URL) {
    console.error('[bootstrap] ADMIN_DATABASE_URL is required');
    process.exit(1);
}

try {
    const maintenance = new URL(ADMIN_DATABASE_URL);
    maintenance.pathname = '/postgres';

    const admin = new pg.Client({ connectionString: maintenance.toString() });
    await admin.connect();
    try {
        // 1. runtime role: create when missing; rotate to the DATABASE_URL
        //    password whenever one is provided there.
        const runtimePassword = DATABASE_URL ? new URL(DATABASE_URL).password : '';
        const role = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [APP_ROLE]);
        if (role.rowCount === 0) {
            if (!runtimePassword) {
                throw new Error(`role ${APP_ROLE} is missing and DATABASE_URL has no password to set`);
            }
            await admin.query(
                `CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${escapeLiteral(runtimePassword)}' NOBYPASSRLS`,
            );
            console.log(`[bootstrap] created role ${APP_ROLE}`);
        } else if (runtimePassword) {
            await admin.query(
                `ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${escapeLiteral(runtimePassword)}' NOBYPASSRLS`,
            );
            console.log(`[bootstrap] password for ${APP_ROLE} set from DATABASE_URL`);
        }

        // 2. application database
        const db = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [APP_DB]);
        if (db.rowCount === 0) {
            await admin.query(`CREATE DATABASE ${APP_DB}`);
            console.log(`[bootstrap] created database ${APP_DB}`);
        } else {
            console.log(`[bootstrap] database ${APP_DB} already present`);
        }
    } finally {
        await admin.end();
    }

    // 3. connect rights for the runtime role on the app database
    const appDb = new pg.Client({ connectionString: ADMIN_DATABASE_URL });
    await appDb.connect();
    try {
        await appDb.query(`GRANT CONNECT ON DATABASE ${APP_DB} TO ${APP_ROLE}`);
    } finally {
        await appDb.end();
    }

    console.log('[bootstrap] ok');
} catch (error) {
    console.error(`[bootstrap] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
}

// Only role names and properly escaped literals are inlined into DDL here.
function escapeLiteral(value) {
    return value.replace(/'/g, "''");
}
