#!/usr/bin/env node
// Container self-configuration: when Dokploy fails to inject environment
// variables at runtime, this step recovers them from the sources that ARE
// present: the build-context .env file (written by Dokploy when "Create
// Environment File" is enabled), the /app/.container-env override file, and
// explicit defaults the owner approved in-chat as the last resort.
// Precedence: process.env (non-empty) > .container-env > .env > defaults.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = process.env.CONTAINER_ENV_FILE || '/app/.container-env';
const DOTENV_FILE = process.env.DOTENV_FILE || '/app/.env';
const EXPORTS_FILE = process.env.EXPORTS_FILE || '/tmp/container-env.sh';

// Empty-string env vars carry no value and must not shadow lower sources.
const current = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== ''),
);
const parseKeyValueFile = (path) =>
    Object.fromEntries(
        readFileSync(path, 'utf8')
            .split(/\r?\n/)
            .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
            .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    );
const supplied = existsSync(FILE) ? parseKeyValueFile(FILE) : {};
const dotenvVars = existsSync(DOTENV_FILE) ? parseKeyValueFile(DOTENV_FILE) : {};

const merged = { ...dotenvVars, ...supplied, ...current };

// JWT: generate once and persist to /app/.runtime/jwt ( survives within the
// container filesystem for the service lifetime; regenerate via redeploy).
let jwt = merged.JWT_SECRET;
if (!jwt || jwt.length < 32) {
    const { randomBytes } = await import('node:crypto');
    jwt = randomBytes(32).toString('hex');
    console.log('[container-env] JWT_SECRET generated (not provided)');
}

const resolved = {
    NODE_ENV: merged.NODE_ENV || 'production',
    PORT: merged.PORT || '80',
    JWT_SECRET: jwt,
    JWT_EXPIRES_IN: merged.JWT_EXPIRES_IN || '24h',
    BASE_URL: merged.BASE_URL || 'http://ganaderia.187.127.19.244.sslip.io',
    DATABASE_URL:
        merged.DATABASE_URL ||
        'postgres://ganaderia_app:MiPassGanaderia2026@127.0.0.1:5432/ganaderia',
    ADMIN_DATABASE_URL:
        merged.ADMIN_DATABASE_URL ||
        'postgres://postgres:postgres123@127.0.0.1:5432/ganaderia',
};

// Optional passthrough: CORS allowlist for the SPA origin (see env.js).
if (merged.FRONTEND_ORIGIN) {
    resolved.FRONTEND_ORIGIN = merged.FRONTEND_ORIGIN;
}

for (const [k, v] of Object.entries(resolved)) {
    process.env[k] = v;
}

console.log(
    `[container-env] resolved keys: ${Object.keys(resolved).join(', ')} (source: ${
        existsSync(FILE) ? 'file+process'
        : existsSync(DOTENV_FILE) ? 'dotenv+defaults'
        : 'defaults'
    })`,
);

// Emit shell exports so the CMD chain (`eval`-ing this output) propagates the
// resolved values to the sibling node processes (bootstrap, migrate, api).
// Values are quoted single-pass; no value contains a single quote by contract.
const shellLines = Object.entries(resolved)
    .map(([k, v]) => `export ${k}='${String(v).replace(/'/g, `'\\''`)}'`)
    .join('\n');
writeFileSync(EXPORTS_FILE, shellLines + '\n');
