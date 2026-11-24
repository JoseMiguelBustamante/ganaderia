// container-env resolves build-context .env values as a fallback source.
// Dokploy injects panel env vars into the Docker build context as a .env
// file; the container must honor it when the runtime env is empty.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'container-env.js');

describe('container-env .env fallback', () => {
  it('resolves values from the build .env file when not in process.env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cenv-'));
    writeFileSync(
        join(dir, '.env'),
        [
            `JWT_SECRET=${'a'.repeat(32)}`,
            'BASE_URL=http://ganaderia.example.test',
            'DATABASE_URL=postgres://ganaderia_app:secret@ganaderia-db-ngcyyy:5432/ganaderia',
            'ADMIN_DATABASE_URL=postgres://ganaderia_app:secret@ganaderia-db-ngcyyy:5432/ganaderia',
        ].join('\n'),
    );
    const out = join(dir, 'exports.sh');
    execFileSync(process.execPath, [SCRIPT], {
        env: {
            ...process.env,
            DATABASE_URL: '',
            ADMIN_DATABASE_URL: '',
            JWT_SECRET: '',
            BASE_URL: '',
            CONTAINER_ENV_FILE: join(dir, 'absent'),
            DOTENV_FILE: join(dir, '.env'),
            EXPORTS_FILE: out,
        },
    });
    const sh = readFileSync(out, 'utf8');
    expect(sh).toContain(
        "export DATABASE_URL='postgres://ganaderia_app:secret@ganaderia-db-ngcyyy:5432/ganaderia'",
    );
    expect(sh).toContain("export BASE_URL='http://ganaderia.example.test'");
    expect(sh).toContain(`export JWT_SECRET='${'a'.repeat(32)}'`);
  });

  it('lets explicit process.env values win over the .env file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cenv-'));
    writeFileSync(join(dir, '.env'), 'BASE_URL=http://from-file.example.test\n');
    const out = join(dir, 'exports.sh');
    execFileSync(process.execPath, [SCRIPT], {
        env: {
            ...process.env,
            BASE_URL: 'http://from-process.example.test',
            CONTAINER_ENV_FILE: join(dir, 'absent'),
            DOTENV_FILE: join(dir, '.env'),
            EXPORTS_FILE: out,
        },
    });
    expect(readFileSync(out, 'utf8')).toContain(
        "export BASE_URL='http://from-process.example.test'",
    );
  });
});
