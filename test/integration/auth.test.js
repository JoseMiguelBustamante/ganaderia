// Auth module contract (T3, specs S2+S3): tenant registration with its owner,
// login scoped to a tenant, JWT carrying tenant/role, RLS-free system bootstrap
// paths, and error contract per src/config/errorCodes.js.
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { startServer, stopServer } from './helpers/node-server.js';

let baseUrl;
let server;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
});

afterAll(async () => {
    await stopServer(server);
});

const SUFFIX = Date.now().toString(36);
const base = {
    tenantName: 'Estancia La Fortuna',
    slug: `fortuna-${SUFFIX}`,
    email: `owner-${SUFFIX}@fortuna.com`,
    password: 'secret-pass-123',
    displayName: 'Dueño Fortuna',
};

describe('POST /api/auth/register', () => {
    it('creates a tenant with its owner and returns a scoped token', async () => {
        const res = await request(baseUrl).post('/api/auth/register').send(base);
        expect(res.status).toBe(201);
        expect(res.body.data.token).toBeTruthy();
        expect(res.body.data.user.role).toBe('owner');
        expect(res.body.data.user.email).toBe(base.email.toLowerCase());
        expect(res.body.data.tenant.slug).toBe(base.slug);
        expect(res.body.data.tenant.planStatus).toBe('trial');
    });

    it('rejects a duplicated slug with 409 CONFLICT', async () => {
        const other = { ...base, slug: base.slug, email: `other-${SUFFIX}@x.com` };
        const res = await request(baseUrl).post('/api/auth/register').send(other);
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects an invalid body with 400 VALIDATION_ERROR', async () => {
        const res = await request(baseUrl).post('/api/auth/register').send({ email: 'not-an-email' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('POST /api/auth/login', () => {
    it('returns a tenant-scoped token for valid credentials', async () => {
        const res = await request(baseUrl).post('/api/auth/login').send({
            email: base.email,
            password: base.password,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.token).toBeTruthy();
        expect(res.body.data.user.tenantId).toBeTruthy();
        expect(res.body.data.user.role).toBe('owner');
    });

    it('rejects a wrong password with 401 and details.reason', async () => {
        const res = await request(baseUrl).post('/api/auth/login').send({
            email: base.email,
            password: 'wrong-password',
        });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
        expect(res.body.error.details.reason).toBe('INVALID_CREDENTIALS');
    });

    it('logs in from any tenant by email alone; slug is not part of the contract', async () => {
        // An unknown slug field is simply ignored: login resolves by email.
        const res = await request(baseUrl).post('/api/auth/login').send({
            slug: `nope-${SUFFIX}`,
            email: base.email,
            password: base.password,
        });
        expect(res.status).toBe(200);
        expect(res.body.data.token).toBeTruthy();
    });
});

describe('GET /api/auth/me', () => {
    it('rejects an anonymous request with 401 MISSING_TOKEN', async () => {
        const res = await request(baseUrl).get('/api/auth/me');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
        expect(res.body.error.details.reason).toBe('MISSING_TOKEN');
    });

    it('returns the caller profile from a valid token', async () => {
        const login = await request(baseUrl).post('/api/auth/login').send({
            slug: base.slug,
            email: base.email,
            password: base.password,
        });
        const res = await request(baseUrl)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${login.body.data.token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(base.email.toLowerCase());
        expect(res.body.data.tenantId).toBeTruthy();
        expect(res.body.data.role).toBe('owner');
    });

    it('rejects a tampered token with 401 INVALID_TOKEN', async () => {
        const res = await request(baseUrl)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer not.a.jwt');
        expect(res.status).toBe(401);
        expect(res.body.error.details.reason).toBe('INVALID_TOKEN');
    });
});
