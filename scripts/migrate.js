#!/usr/bin/env node
// SQL migration runner. Applies scripts/migrations/*.sql in lexical order inside
// transactions and records them in schema_migrations. Idempotent: applied files
// are skipped, so re-running is always safe.
//
// Usage: node scripts/migrate.js [--db dev|test|both] [--status]
// Environment: ADMIN_DATABASE_URL (falls back to DATABASE_URL).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(projectRoot, 'scripts', 'migrations');
const dbs = { dev: 'ganaderia', test: 'ganaderia_test' };

const args = process.argv.slice(2);
const pick = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const target = pick('--db', 'both');
const statusOnly = args.includes('--status');

if (!['dev', 'test', 'both'].includes(target)) {
  console.error('Usage: node scripts/migrate.js [--db dev|test|both] [--status]');
  process.exit(64);
}

const adminUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!adminUrl) {
  console.error('ADMIN_DATABASE_URL or DATABASE_URL is required');
  process.exit(1);
}

const baseUrl = new URL(adminUrl);
const targets = target === 'both' ? ['dev', 'test'] : [target];
let failures = 0;

for (const t of targets) {
  const url = new URL(adminUrl);
  url.pathname = `/${dbs[t]}`;
  try {
    const summary = await migrate(url.toString(), statusOnly);
    console.log(`[migrate:${t}] ${summary}`);
  } catch (error) {
    failures += 1;
    console.error(`[migrate:${t}] failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
process.exit(failures > 0 ? 1 : 0);

async function migrate(connectionString, onlyStatus) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    if (onlyStatus) {
      const { rows } = await client.query('SELECT name, applied_at FROM schema_migrations ORDER BY name');
      return `${rows.length}/${files.length} applied`;
    }
    let applied = 0;
    for (const file of files) {
      const known = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (known.rowCount > 0) continue;
      const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${file}: ${error.message}`);
      }
    }
    return `${applied} applied, ${files.length - applied} already present`;
  } finally {
    await client.end();
  }
}
