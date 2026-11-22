// Auth security regression probes (independent verification round).
// Covers: uniform 401 for every credential miss (no tenant/email enumeration),
// expired/unsigned token rejection with precise reasons, and cross-tenant
// lookup rejection through a signed mismatched claim.
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { startServer, stopServer } from './helpers/node-server.js';

let server;
let url;
let a;
let b;

const credentials = {
    slug: 'security-probe-a',
    email: 'owner@security-probe.test',
    password: 'security-pass-123',
};

const uniformUnauthorized = {
    error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: { reason: 'INVALID_CREDENTIALS' },
    },
};

beforeAll(async () => {
    ({ server, baseUrl: url } = await startServer());
    const register = async (slug) => {
        const res = await request(url).post('/api/auth/register').send({
            ...credentials,
            slug,
            tenantName: slug,
            displayName: 'Security Probe',
        });
        expect(res.status).toBe(201);
        expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
        return res.body.data;
    };
    a = await register(credentials.slug);
    b = await register('security-probe-b');
});

afterAll(async () => {
    await stopServer(server);
});

describe('login credential misses', () => {
    it('returns exactly the same error for all credential misses', async () => {
        for (const change of [
            { slug: 'security-probe-absent' },
            { email: 'absent@security-probe.test' },
            { password: 'incorrect-password' },
        ]) {
            const res = await request(url).post('/api/auth/login')
                .send({ ...credentials, ...change });
            expect(res.status).toBe(401);
            expect(res.body).toEqual(uniformUnauthorized);
        }
    });
});

describe('token verification', () => {
    it('rejects expired and unsigned tokens with precise auth reasons', async () => {
        const claims = {
            sub: a.user.id,
            tenantId: a.tenant.id,
            role: 'owner',
        };
        const tokens = [
            [jwt.sign(claims, env.JWT_SECRET, { expiresIn: -1 }), 'EXPIRED_TOKEN'],
            [jwt.sign(claims, '', { algorithm: 'none' }), 'INVALID_TOKEN'],
        ];
        for (const [token, reason] of tokens) {
            const res = await request(url).get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(401);
            expect(res.body).toEqual({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    details: { reason },
                },
            });
        }
    });

    it('does not resolve another tenant user with a signed mismatched claim', async () => {
        const token = jwt.sign({
            sub: b.user.id,
            tenantId: a.tenant.id,
            role: 'owner',
        }, env.JWT_SECRET, { expiresIn: '1m' });
        const res = await request(url).get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: { code: 'NOT_FOUND', message: 'Resource not found' },
        });
    });
});
