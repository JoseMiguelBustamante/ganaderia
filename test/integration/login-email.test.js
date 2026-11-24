// Front-end login is email-only now; integration suite must keep proving
// the same semantics over HTTP. Mirrors auth.test.js seed flow but login
// posts { email, password } without slug.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Extend the existing integration auth suite: run the login-without-slug case
// inside the integration harness by importing shared helpers lazily.
// (Kept as a separate file to leave auth.test.js untouched.)
import { beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from '../integration/helpers/node-server.js';
import { randomUUID } from 'node:crypto';

const SUFFIX = randomUUID();

describe('login by email only (integration)', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const res = await request(baseUrl).post('/api/auth/register').send({
      tenantName: `EmailLogin ${SUFFIX}`,
      slug: `email-login-${SUFFIX}`,
      email: `owner-${SUFFIX}@email-login.example`,
      password: 'secret-pass-123',
      displayName: 'Owner',
    });
    expect(res.status).toBe(201);
  });

  afterAll(async () => {
    await stopServer(server);
  });

  it('logs in with { email, password } without slug', async () => {
    const res = await request(baseUrl).post('/api/auth/login').send({
      email: `owner-${SUFFIX}@email-login.example`,
      password: 'secret-pass-123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(`owner-${SUFFIX}@email-login.example`);
  });

  it('rejects wrong password with INVALID_CREDENTIALS', async () => {
    const res = await request(baseUrl).post('/api/auth/login').send({
      email: `owner-${SUFFIX}@email-login.example`,
      password: 'wrong-pass-000',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.details.reason).toBe('INVALID_CREDENTIALS');
  });
});
