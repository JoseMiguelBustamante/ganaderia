#!/usr/bin/env node
// Development/test database lifecycle for the embedded PostgreSQL cluster.
// Dev/test only: production always connects to a real PostgreSQL via DATABASE_URL.
//
// Commands:
//   node scripts/db.js init   fresh cluster (initdb) + dev/test databases, then leave it stopped
//   node scripts/db.js up     start the cluster in the background via pg_ctl (init when missing)
//   node scripts/db.js down   graceful stop via pg_ctl
//   node scripts/db.js reset  drop the cluster, then init
//   node scripts/db.js smoke  ephemeral cluster: connect, query, stop (CI-safe)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pgDataRoot = path.join(projectRoot, '.pgdata');
const dataDir = path.join(pgDataRoot, 'db');
const serverLog = path.join(pgDataRoot, 'postgres.log');
const PG_PORT = Number(process.env.PG_PORT || 55432);
const PG_USER = 'postgres';
const PG_PASSWORD = 'postgres';
const DB_DEV = 'ganaderia';
const DB_TEST = 'ganaderia_test';

const nativeBin = path.join(projectRoot, 'node_modules', '@embedded-postgres', 'linux-x64', 'native', 'bin');

const command = process.argv[2];

if (!command || !['init', 'up', 'down', 'reset', 'smoke'].includes(command)) {
  console.error('Usage: node scripts/db.js <init|up|down|reset|smoke>');
  process.exit(64);
}

log(`command=${command}`);

try {
  if (command === 'smoke') process.exit(await runSmoke());
  else await runLifecycle(command);
} catch (error) {
  log(`error: ${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
}

function log(message) {
  console.log(`[db] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function portIsOpen(port, host = '127.0.0.1', retries = 0, delayMs = 250) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const open = await new Promise((resolve) => {
      const socket = net.connect({ port, host });
      socket.setTimeout(1000);
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('timeout', () => { socket.destroy(); resolve(false); });
      socket.once('error', () => resolve(false));
    });
    if (open) return true;
    if (attempt === retries) return false;
    await sleep(delayMs);
  }
  return false;
}

function runTool(bin, args) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: 'ignore' });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`unsafe database name: ${name}`);
  return `"${name}"`;
}

async function ensureDatabases() {
  const admin = new pg.Client({ host: '127.0.0.1', port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: 'postgres' });
  await admin.connect();
  try {
    for (const name of [DB_DEV, DB_TEST]) {
      const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
      if (found.rowCount === 0) {
        await admin.query(`CREATE DATABASE ${quoteIdent(name)}`);
        log(`created database ${name}`);
      }
    }
  } finally {
    await admin.end();
  }
}

async function initClusterFiles() {
  if (existsSync(path.join(dataDir, 'PG_VERSION'))) {
    log('cluster files already initialised');
    return;
  }
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(pgDataRoot, { recursive: true });
  log(`initialising cluster at ${dataDir}`);
  const instance = new EmbeddedPostgres({ databaseDir: dataDir, user: PG_USER, password: PG_PASSWORD, port: PG_PORT, persistent: false });
  await instance.initialise();
}

async function startServer() {
  if (await portIsOpen(PG_PORT)) {
    log(`port ${PG_PORT} already serving PostgreSQL — nothing to do`);
    return false;
  }
  const code = await runTool(pgCtlPath(), ['-D', dataDir, '-l', serverLog, '-o', `-p ${PG_PORT}`, 'start']);
  if (code !== 0) throw new Error(`pg_ctl start failed with exit code ${code}`);
  const ready = await portIsOpen(PG_PORT, '127.0.0.1', 40, 250);
  if (!ready) throw new Error('PostgreSQL did not become ready on its port');
  return true;
}

function pgCtlPath() {
  return path.join(nativeBin, 'pg_ctl');
}

async function stopServer() {
  if (!existsSync(dataDir)) {
    log('no cluster to stop');
    return;
  }
  const code = await runTool(pgCtlPath(), ['-D', dataDir, '-m', 'fast', 'stop']);
  if (code !== 0) {
    if (!(await portIsOpen(PG_PORT))) {
      log('cluster already stopped');
      return;
    }
    throw new Error(`pg_ctl stop failed with exit code ${code}`);
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && (await portIsOpen(PG_PORT))) await sleep(200);
  log('cluster stopped');
}

async function runLifecycle(commandKind) {
  if (commandKind === 'down') return stopServer();

  if (commandKind === 'reset') {
    await stopServerSilently();
    rmSync(pgDataRoot, { recursive: true, force: true });
    log('cluster removed');
    commandKind = 'init';
  }

  await initClusterFiles();
  const started = await startServer();
  await ensureDatabases();
  log(`cluster ready on port ${PG_PORT} (databases: ${DB_DEV}, ${DB_TEST})`);
  if (commandKind === 'init' || !started) {
    if (commandKind === 'init') {
      await stopServer();
      log('initialised; start later with `npm run db:up`');
    } else {
      log('already running; nothing to do');
    }
  } else {
    log('started in background (log: .pgdata/postgres.log)');
  }
}

async function stopServerSilently() {
  try { await stopServer(); } catch (error) { log(`stop skipped: ${error.message}`); }
}

async function runSmoke() {
  const epdDir = path.join(pgDataRoot, 'smoke');
  rmSync(epdDir, { recursive: true, force: true });
  const instance = new EmbeddedPostgres({ databaseDir: epdDir, user: PG_USER, password: PG_PASSWORD, port: PG_PORT, persistent: false });
  try {
    await instance.initialise();
    await instance.start();
    await instance.createDatabase(DB_TEST);
    const client = new pg.Client({ host: '127.0.0.1', port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: DB_TEST });
    await client.connect();
    const version = await client.query('SELECT version() AS v');
    const echo = await client.query('SELECT $1::text AS echo', ['ganaderia']);
    if (echo.rows[0].echo !== 'ganaderia') throw new Error('parameter roundtrip failed');
    await client.end();
    console.log(`smoke ok: ${version.rows[0].v}`);
    return 0;
  } catch (error) {
    console.error(`smoke failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    try { await instance.stop(); } catch { /* already stopped */ }
    rmSync(epdDir, { recursive: true, force: true });
  }
}
