// Default breeding protocol (Fase 3, T1): one POST creates the standard
// 7-phase breeding protocol without listing every phase manually.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
const STANDARD_PHASES = ['Chequeo', 'Preparo', 'Inseminación', 'Gestación', 'Preparto', 'Parto', 'Destete'];
let server;
let baseUrl;
let tokenA;
let tokenB;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Breeding ${tenant}`,
            slug: `breeding-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@breeding.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
});

afterAll(async () => {
    await stopServer(server);
});

const api = (method, url, body, token = tokenA) => request(baseUrl)[method](url)
    .set('Authorization', `Bearer ${token}`).send(body);

describe('default breeding protocol API', () => {
    it('creates the standard 7-phase breeding protocol with a single POST', async () => {
        const res = await api('post', '/api/protocols/breeding');
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Cría');
        const phases = res.body.data.phases;
        expect(phases).toHaveLength(7);
        expect(phases.map((p) => p.phaseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(phases.map((p) => p.name)).toEqual(STANDARD_PHASES);
        expect(phases.every((p) => p.requiredItemId === null && p.requiredQty === null)).toBe(true);
    });

    it('is idempotent per tenant: a second call returns the existing protocol', async () => {
        const first = await api('get', '/api/protocols');
        const before = first.body.data.length;
        const res = await api('post', '/api/protocols/breeding');
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Cría');
        expect(res.body.data.phases).toHaveLength(7);
        const after = await api('get', '/api/protocols');
        expect(after.body.data.length).toBe(before);
    });

    it('isolates tenants: tenant B gets its own breeding protocol', async () => {
        const res = await api('post', '/api/protocols/breeding', undefined, tokenB);
        expect(res.status).toBe(201);
        expect(res.body.data.phases).toHaveLength(7);
        const listB = await api('get', '/api/protocols', undefined, tokenB);
        expect(listB.body.data).toHaveLength(1);
        const listA = await api('get', '/api/protocols');
        expect(listA.body.data.some((p) => p.name === 'Cría')).toBe(true);
    });

    it('requires authentication', async () => {
        const res = await request(baseUrl).post('/api/protocols/breeding');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
});
