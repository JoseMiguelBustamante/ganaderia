// Semen lots (Fase 2 / M2, T3): tenant-scoped lots tied to a semen inventory
// item and supplier; consumption is atomic (single transaction deducts doses
// from both the lot and the item stock, with a ledger movement).
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;
let tokenA;
let tokenB;
let itemId;
let supplierId;
let lotId;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Semen ${tenant}`,
            slug: `semen-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@semen.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
    const api = (method, url, body) => request(baseUrl)[method](url)
        .set('Authorization', `Bearer ${tokenA}`).send(body);
    const item = await api('post', '/api/inventory', { name: `Semen Ajax ${SUFFIX}`, category: 'semen' });
    itemId = item.body.data.id;
    const supplier = await api('post', '/api/suppliers', { name: `Genética Sur ${SUFFIX}` });
    supplierId = supplier.body.data.id;
    await api('post', `/api/inventory/${itemId}/stock`, { qty: 20 });
});

afterAll(async () => {
    await stopServer(server);
});

const api = (method, url, body, token = tokenA) => request(baseUrl)[method](url)
    .set('Authorization', `Bearer ${token}`).send(body);

describe('semen lots API', () => {
    it('creates a lot linked to item and supplier with total doses', async () => {
        const res = await api('post', '/api/semen-lots', {
            itemId,
            supplierId,
            lotCode: `AJ-2026-${SUFFIX.slice(0, 8)}`,
            totalDoses: 10,
            expiresAt: '2028-06-30',
        });
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
            itemId,
            supplierId,
            totalDoses: 10,
            availableDoses: 10,
            status: 'available',
        });
        lotId = res.body.data.id;
    });

    it('rejects a lot for a nonexistent item without mutation', async () => {
        const res = await api('post', '/api/semen-lots', {
            itemId: randomUUID(),
            supplierId,
            lotCode: `XX-${SUFFIX.slice(0, 8)}`,
            totalDoses: 5,
        });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects a lot for a non-semen item without mutation', async () => {
        const vaccine = await api('post', '/api/inventory', { name: `Vacuna X ${SUFFIX}`, category: 'vaccine' });
        const res = await api('post', '/api/semen-lots', {
            itemId: vaccine.body.data.id,
            supplierId,
            lotCode: `VX-${SUFFIX.slice(0, 8)}`,
            totalDoses: 3,
        });
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('BUSINESS_RULE');
        expect(res.body.error.details.reason).toBe('ITEM_NOT_SEMEN');
    });

    it('consumes doses atomically: lot, item stock and ledger all move', async () => {
        const res = await api('post', `/api/semen-lots/${lotId}/consume`, { doses: 4, animalId: null });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ availableDoses: 6 });
        const item = await api('get', `/api/inventory/${itemId}`);
        expect(item.body.data.stockQty).toBe(16);
    });

    it('rejects consuming more doses than available without mutation', async () => {
        const before = await api('get', `/api/inventory/${itemId}`);
        const res = await api('post', `/api/semen-lots/${lotId}/consume`, { doses: 7 });
        expect(res.status).toBe(422);
        expect(res.body.error.details.reason).toBe('NOT_ENOUGH_DOSES');
        const after = await api('get', `/api/inventory/${itemId}`);
        expect(after.body).toEqual(before.body);
        const lot = await api('get', `/api/semen-lots/${lotId}`);
        expect(lot.body.data.availableDoses).toBe(6);
    });

    it('marks the lot depleted exactly when the last dose is consumed', async () => {
        const res = await api('post', `/api/semen-lots/${lotId}/consume`, { doses: 6 });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('depleted');
        const again = await api('post', `/api/semen-lots/${lotId}/consume`, { doses: 1 });
        expect(again.status).toBe(422);
        expect(again.body.error.details.reason).toBe('LOT_DEPLETED');
    });

    it('isolates tenants: tenant B cannot see or consume tenant A lots', async () => {
        const list = await api('get', '/api/semen-lots', undefined, tokenB);
        expect(list.status).toBe(200);
        expect(list.body.data).toHaveLength(0);
        const cross = await api('post', `/api/semen-lots/${lotId}/consume`, { doses: 1 }, tokenB);
        expect(cross.status).toBe(404);
    });

    it('requires authentication for every semen-lots route', async () => {
        for (const operation of [
            request(baseUrl).post('/api/semen-lots').send({}),
            request(baseUrl).get('/api/semen-lots'),
            request(baseUrl).get(`/api/semen-lots/${lotId}`),
            request(baseUrl).post(`/api/semen-lots/${lotId}/consume`).send({}),
        ]) {
            const res = await operation;
            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        }
    });
});
