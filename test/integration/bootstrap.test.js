// Bootstrap contract: role ganaderia_app exists, its password matches
// DATABASE_URL, and the app database is present. Runs against the ephemeral
// test cluster; rotation uses the SAME password the suite already uses so
// parallel test files keep connecting.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import pg from 'pg';

const BOOTSTRAP = path.resolve('scripts/bootstrap-db.js');

function runBootstrap(env) {
    return execFileSync(process.execPath, [BOOTSTRAP], {
        env: { ...process.env, ...env },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

describe('scripts/bootstrap-db.js', () => {
    it('is idempotent and leaves the runtime role connectable with the DATABASE_URL password', async () => {
        const url = process.env.DATABASE_URL;
        const adminUrl = process.env.ADMIN_DATABASE_URL;
        expect(url).toBeTruthy();
        expect(adminUrl).toBeTruthy();

        const out1 = runBootstrap({ DATABASE_URL: url, ADMIN_DATABASE_URL: adminUrl });
        const out2 = runBootstrap({ DATABASE_URL: url, ADMIN_DATABASE_URL: adminUrl });
        expect(out2).toContain('[bootstrap] ok');
        expect(out2).toContain('already present');

        // the runtime role must actually connect with the rotated password
        const runtime = new pg.Client({ connectionString: url });
        await runtime.connect();
        const who = await runtime.query('SELECT current_user AS u');
        await runtime.end();
        expect(who.rows[0].u).toBe('ganaderia_app');
    });

    it('fails closed when ADMIN_DATABASE_URL is missing', () => {
        let failed = false;
        try {
            runBootstrap({ ADMIN_DATABASE_URL: '', DATABASE_URL: process.env.DATABASE_URL });
        } catch {
            failed = true;
        }
        expect(failed).toBe(true);
    });
});
