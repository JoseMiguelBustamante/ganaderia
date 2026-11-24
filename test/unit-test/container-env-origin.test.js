// FRONTEND_ORIGIN passthrough: container-env must carry the CORS allowlist
// value from the build .env into the boot chain exports.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'container-env.js');

describe('container-env FRONTEND_ORIGIN passthrough', () => {
  it('exports FRONTEND_ORIGIN when present in the .env file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cenv-origin-'));
    writeFileSync(
        join(dir, '.env'),
        [
            `JWT_SECRET=${'b'.repeat(32)}`,
            'FRONTEND_ORIGIN=https://ganaderia-web.example',
        ].join('\n'),
    );
    const out = join(dir, 'exports.sh');
    execFileSync(process.execPath, [SCRIPT], {
        env: {
            ...process.env,
            CONTAINER_ENV_FILE: join(dir, 'absent'),
            DOTENV_FILE: join(dir, '.env'),
            EXPORTS_FILE: out,
        },
    });
    const sh = readFileSync(out, 'utf8');
    expect(sh).toContain("export FRONTEND_ORIGIN='https://ganaderia-web.example'");
  });

  it('omits FRONTEND_ORIGIN when not provided', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cenv-noorigin-'));
    writeFileSync(join(dir, '.env'), `JWT_SECRET=${'c'.repeat(32)}\n`);
    const out = join(dir, 'exports.sh');
    execFileSync(process.execPath, [SCRIPT], {
        env: {
            ...process.env,
            CONTAINER_ENV_FILE: join(dir, 'absent'),
            DOTENV_FILE: join(dir, '.env'),
            EXPORTS_FILE: out,
        },
    });
    expect(readFileSync(out, 'utf8')).not.toContain('FRONTEND_ORIGIN');
  });
});
