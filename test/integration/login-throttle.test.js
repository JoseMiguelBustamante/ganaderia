// Brute-force protection over HTTP (operar con confianza, T1): repeated wrong
// passwords for one account are throttled with 429 RATE_LIMITED, and the
// counter is independent per email so one account cannot lock another.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
});

afterAll(async () => {
    await stopServer(server);
});

const login = (email, password) => request(baseUrl).post('/api/auth/login').send({ email, password });

describe('login throttling', () => {
    it('answers 429 RATE_LIMITED after too many wrong passwords for one account', async () => {
        const email = `brute-${SUFFIX}@throttle.example`;
        await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Throttle ${SUFFIX}`,
            slug: `throttle-${SUFFIX}`,
            email,
            password: 'secret-pass-123',
            displayName: 'Owner',
        });

        let blocked = null;
        for (let attempt = 1; attempt <= 12; attempt += 1) {
            const res = await login(email, 'wrong-password');
            if (res.status === 429) { blocked = res; break; }
            expect(res.status).toBe(401);
        }

        expect(blocked).not.toBeNull();
        expect(blocked.body.error.code).toBe('RATE_LIMITED');
        expect(blocked.body.error.details.retryAfter).toBeGreaterThan(0);
        // The correct password is also refused while the window is open.
        const withCorrect = await login(email, 'secret-pass-123');
        expect(withCorrect.status).toBe(429);
    });

    it('keeps counters per account: another email still logs in', async () => {
        const other = `other-${SUFFIX}@throttle.example`;
        await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Other ${SUFFIX}`,
            slug: `other-${SUFFIX}`,
            email: other,
            password: 'secret-pass-123',
            displayName: 'Other',
        });
        const res = await login(other, 'secret-pass-123');
        expect(res.status).toBe(200);
        expect(res.body.data.token).toBeTruthy();
    });
});
