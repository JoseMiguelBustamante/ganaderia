// Stock alerts (Fase 2 / M2, T4): items at or below min_stock, semen lots
// running low and expired/expiring lots.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;
let tokenA;
let tokenB;
let lowItemId;
let okItemId;
let lowLotId;
let expiredLotId;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Alerts ${tenant}`,
            slug: `alerts-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@alerts.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
    const api = (method, url, body) => request(baseUrl)[method](url)
        .set('Authorization', `Bearer ${tokenA}`).send(body);

    // Item at/below min stock (0 qty, min 5) and a healthy one.
    const low = await api('post', '/api/inventory', {
        name: `Vacuna Baja ${SUFFIX}`, category: 'vaccine', minStock: 5,
    });
    lowItemId = low.body.data.id;
    const ok = await api('post', '/api/inventory', {
        name: `Insumo Ok ${SUFFIX}`, category: 'supply', minStock: 2,
    });
    okItemId = ok.body.data.id;
    await api('post', `/api/inventory/${okItemId}/stock`, { qty: 10 });

    // Semen item for lots: one nearly depleted, one expired.
    const semen = await api('post', '/api/inventory', {
        name: `Semen Alertas ${SUFFIX}`, category: 'semen',
    });
    const semenItemId = semen.body.data.id;
    await api('post', `/api/inventory/${semenItemId}/stock`, { qty: 15 });
    const lowLot = await api('post', '/api/semen-lots', {
        itemId: semenItemId, lotCode: `LOW-${SUFFIX.slice(0, 8)}`, totalDoses: 10,
    });
    lowLotId = lowLot.body.data.id;
    await api('post', `/api/semen-lots/${lowLotId}/consume`, { doses: 8 });
    const expired = await api('post', '/api/semen-lots', {
        itemId: semenItemId, lotCode: `EXP-${SUFFIX.slice(0, 8)}`,
        totalDoses: 5, expiresAt: '2026-01-01',
    });
    expiredLotId = expired.body.data.id;
});

afterAll(async () => {
    await stopServer(server);
});

const alerts = (token = tokenA) => request(baseUrl)
    .get('/api/inventory/alerts').set('Authorization', `Bearer ${token}`);

describe('stock alerts API', () => {
    it('lists low-stock items, low semen lots and expired lots', async () => {
        const res = await alerts();
        expect(res.status).toBe(200);
        const { lowStockItems, lowDoseLots, expiredLots } = res.body.data;

        expect(lowStockItems.some((i) => i.id === lowItemId)).toBe(true);
        expect(lowStockItems.some((i) => i.id === okItemId)).toBe(false);

        expect(lowDoseLots.some((l) => l.id === lowLotId)).toBe(true);
        expect(lowDoseLots.find((l) => l.id === lowLotId).availableDoses).toBe(2);

        expect(expiredLots.some((l) => l.id === expiredLotId)).toBe(true);
    });

    it('returns every section empty when nothing is low', async () => {
        const res = await alerts(tokenB);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ lowStockItems: [], lowDoseLots: [], expiredLots: [] });
    });

    it('isolates tenants', async () => {
        const res = await alerts(tokenB);
        expect(res.body.data.lowStockItems.some((i) => i.id === lowItemId)).toBe(false);
        expect(res.body.data.lowDoseLots.some((l) => l.id === lowLotId)).toBe(false);
    });

    it('requires authentication', async () => {
        const res = await request(baseUrl).get('/api/inventory/alerts');
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
});
