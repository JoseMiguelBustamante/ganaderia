// Ephemeral PostgreSQL cluster for integration tests. Started by vitest
// globalSetup; port 55433 so it never collides with the dev cluster. Teardown
// stops and deletes everything.
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const TEST_PORT = Number(process.env.TEST_PG_PORT || 55433);
export const TEST_USER = 'postgres';
export const TEST_PASSWORD = 'postgres';
export const TEST_DB = 'ganaderia_test';
export const APP_DATABASE_URL = `postgres://ganaderia_app:ganaderia_app_dev@127.0.0.1:${TEST_PORT}/${TEST_DB}`;
export const ADMIN_DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${TEST_PORT}/${TEST_DB}`;

let instance = null;

export async function start({
    dataDir = path.join(projectRoot, '.pgdata', 'test'),
} = {}) {
    // Always start from a pristine cluster: a previous interrupted run may have
    // left postmaster.pid behind, and initdb takes ~1s. Deterministic beats fast.
    rmSync(dataDir, { recursive: true, force: true });
    instance = new EmbeddedPostgres({
        databaseDir: dataDir,
        user: TEST_USER,
        password: TEST_PASSWORD,
        port: TEST_PORT,
        persistent: false,
    });
    await step('initialise', () => instance.initialise());
    await step('start', () => instance.start());
    await step('createDatabase', () => instance.createDatabase(TEST_DB));
    await step('applyMigrations', applyMigrations);
    process.env.DATABASE_URL = APP_DATABASE_URL;
    process.env.ADMIN_DATABASE_URL = ADMIN_DATABASE_URL;
    return instance;
}

async function step(name, fn) {
    try {
        return await fn();
    } catch (error) {
        console.error(`[pg-cluster] step ${name} failed:`, error && (error.stack || JSON.stringify(error, Object.getOwnPropertyNames(error)) || error));
        throw error;
    }
}

export async function stop() {
    if (!instance) return;
    try {
        await instance.stop();
    } finally {
        instance = null;
    }
    rmSync(path.join(projectRoot, '.pgdata', 'test'), { recursive: true, force: true });
}

function applyMigrations() {
    execFileSync(process.execPath, [path.join(projectRoot, 'scripts', 'migrate.js'), '--db', 'test'], {
        env: { ...process.env, ADMIN_DATABASE_URL: ADMIN_DATABASE_URL, DATABASE_URL: ADMIN_DATABASE_URL },
        stdio: 'inherit',
    });
}
