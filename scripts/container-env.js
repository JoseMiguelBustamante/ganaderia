#!/usr/bin/env node
// Container self-configuration: when Dokploy fails to inject environment
// variables, this step derives the missing ones from variables that ARE
// present, or writes explicit defaults the owner approved in-chat.
// Order: existing process.env always wins; only absent values get filled.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = '/app/.container-env';

const current = { ...process.env };
const supplied = existsSync(FILE)
    ? Object.fromEntries(
          readFileSync(FILE, 'utf8')
              .split(/\r?\n/)
              .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
              .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
      )
    : {};

const merged = { ...supplied, ...current };

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

for (const [k, v] of Object.entries(resolved)) {
    process.env[k] = v;
}

console.log(
    `[container-env] resolved keys: ${Object.keys(resolved).join(', ')} (source: ${
        existsSync(FILE) ? 'file+process' : 'defaults'
    })`,
);
