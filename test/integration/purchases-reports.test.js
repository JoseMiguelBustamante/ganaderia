import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

let server;
let baseUrl;
let tokenA;
let tokenB;
let purchaseId;
let animalId;
let itemId;
let movementId;
const today = new Date().toISOString().slice(0, 10);
const api = (method, path, body, token = tokenA) => {
    const req = request(baseUrl)[method](path).set('Authorization', `Bearer ${token}`);
    return body === undefined ? req : req.send(body);
};
const data = async (method, path, body, status = 200, token = tokenA) => {
    const res = await api(method, path, body, token);
    expect(res.status).toBe(status);
    return res.body.data;
};
const rejected = (res, status, code, reason) => {
    expect(res.status).toBe(status);
    expect(res.body.error).toMatchObject({ code, ...(reason ? { details: { reason } } : {}) });
};
const createPurchase = (body) => data('post', '/api/purchases', body, 201);
const summary = (query = '') => data('get', `/api/reports/summary${query}`);

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const name of ['a', 'b']) {
        const suffix = randomUUID();
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Accounting ${name}`, slug: `accounting-${suffix}`,
            email: `${suffix}@accounting.example`, password: 'secret-pass-123', displayName: 'Owner',
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
});
afterAll(async () => { await stopServer(server); });

describe('purchases and accounts payable', () => {
    it('creates a minimal purchase, reads it and lists by status', async () => {
        const purchase = await createPurchase({ description: 'Servicio sanitario', totalAmount: 100, dueDate: '2000-01-01' });
        expect(purchase).toMatchObject({ description: 'Servicio sanitario', totalAmount: 100,
            paidAmount: 0, status: 'pending', purchasedAt: today, dueDate: '2000-01-01', supplierId: null,
            itemId: null, quantity: null });
        purchaseId = purchase.id;
        expect(await data('get', `/api/purchases/${purchaseId}`)).toEqual(purchase);
        expect(await data('get', '/api/purchases')).toEqual([purchase]);
        expect(await data('get', '/api/purchases?status=pending')).toEqual([purchase]);
        expect(await data('get', '/api/purchases?status=paid')).toEqual([]);
        rejected(await api('get', `/api/purchases/${randomUUID()}`), 404, 'NOT_FOUND');
    });

    it('registers partial and total payments and updates the payable summary', async () => {
        expect(await data('get', '/api/purchases/payables-summary')).toEqual({ totalPending: 100, totalPaid: 0, countPending: 1, overdueCount: 1 });
        const partial = await data('post', `/api/purchases/${purchaseId}/payments`, { amount: 40 });
        expect(partial).toMatchObject({ paidAmount: 40, status: 'partial' });
        expect(await data('get', '/api/purchases?status=partial')).toEqual([partial]);
        expect(await data('get', '/api/purchases/payables-summary')).toEqual({ totalPending: 60, totalPaid: 40, countPending: 1, overdueCount: 1 });
        const paid = await data('post', `/api/purchases/${purchaseId}/payments`, { amount: 60 });
        expect(paid).toMatchObject({ paidAmount: 100, status: 'paid' });
        expect(await data('get', '/api/purchases?status=paid')).toEqual([paid]);
        expect(await data('get', '/api/purchases/payables-summary')).toEqual({ totalPending: 0, totalPaid: 100, countPending: 0, overdueCount: 0 });
    });

    it('rejects excess, zero and negative payments without any mutation', async () => {
        for (const [amount, reason] of [[0.01, 'PAYMENT_EXCEEDS_TOTAL'], [0, 'PAYMENT_MUST_BE_POSITIVE'], [-1, 'PAYMENT_MUST_BE_POSITIVE']]) {
            const before = await data('get', '/api/purchases');
            const totals = await data('get', '/api/purchases/payables-summary');
            rejected(await api('post', `/api/purchases/${purchaseId}/payments`, { amount }), 422, 'BUSINESS_RULE', reason);
            expect(await data('get', '/api/purchases')).toEqual(before);
            expect(await data('get', '/api/purchases/payables-summary')).toEqual(totals);
        }
    });

    it('serializes competing payments and rolls back the rejected one', async () => {
        const purchase = await createPurchase({ description: 'Concurrente', totalAmount: 10 });
        const responses = await Promise.all([1, 2].map(() => api('post', `/api/purchases/${purchase.id}/payments`, { amount: 7 })));
        expect(responses.map((res) => res.status).sort()).toEqual([200, 422]);
        rejected(responses.find((res) => res.status === 422), 422, 'BUSINESS_RULE', 'PAYMENT_EXCEEDS_TOTAL');
        expect(await data('get', `/api/purchases/${purchase.id}`)).toMatchObject({ paidAmount: 7, status: 'partial' });
    });

    it('validates amounts, dates and paired item quantity without mutation', async () => {
        const before = await data('get', '/api/purchases');
        for (const body of [
            { description: '', totalAmount: 1 }, { description: 'Invalid', totalAmount: 0 },
            { description: 'Invalid', totalAmount: 1.001 }, { description: 'Invalid', totalAmount: 1, purchasedAt: '2025-02-30' },
            { description: 'Invalid', totalAmount: 1, itemId: randomUUID() },
            { description: 'Invalid', totalAmount: 1, quantity: 2 },
        ]) rejected(await api('post', '/api/purchases', body), 400, 'VALIDATION_ERROR');
        rejected(await api('get', '/api/purchases?status=invalid'), 400, 'VALIDATION_ERROR');
        expect(await data('get', '/api/purchases')).toEqual(before);
    });

    it('isolates purchases, payments and foreign references between tenants', async () => {
        const supplier = await data('post', '/api/suppliers', { name: 'Supplier A' }, 201);
        const item = await data('post', '/api/inventory', { name: 'Foreign item', category: 'supply' }, 201);
        const own = await createPurchase({ description: 'Con proveedor', totalAmount: 5, supplierId: supplier.id });
        expect(own.supplierId).toBe(supplier.id);
        const before = await data('get', '/api/purchases');
        expect(await data('get', '/api/purchases', undefined, 200, tokenB)).toEqual([]);
        expect(await data('get', '/api/purchases/payables-summary', undefined, 200, tokenB)).toEqual({ totalPending: 0, totalPaid: 0, countPending: 0, overdueCount: 0 });
        rejected(await api('get', `/api/purchases/${purchaseId}`, undefined, tokenB), 404, 'NOT_FOUND');
        rejected(await api('post', `/api/purchases/${purchaseId}/payments`, { amount: 1 }, tokenB), 404, 'NOT_FOUND', 'PURCHASE_NOT_IN_TENANT');
        for (const [extra, reason] of [[{ supplierId: supplier.id }, 'SUPPLIER_NOT_IN_TENANT'], [{ itemId: item.id, quantity: 1 }, 'ITEM_NOT_IN_TENANT']]) {
            rejected(await api('post', '/api/purchases', { description: 'Foreign', totalAmount: 1, ...extra }, tokenB), 422, 'BUSINESS_RULE', reason);
        }
        expect(await data('get', '/api/purchases', undefined, 200, tokenB)).toEqual([]);
        expect(await data('get', '/api/purchases')).toEqual(before);
    });
});

describe('animal and stage cost reports', () => {
    it('values an animal consumption as zero when no purchases exist', async () => {
        const animal = await data('post', '/api/animals', { earTag: 'COST-1', sex: 'female' }, 201);
        animalId = animal.id;
        const item = await data('post', '/api/inventory', { name: 'Cost input', category: 'supply' }, 201);
        itemId = item.id;
        await data('post', `/api/inventory/${itemId}/stock`, { qty: 10 });
        const protocol = await data('post', '/api/protocols', { name: 'Cost protocol', phases: [
            { phaseNumber: 1, name: 'Diagnóstico', requiredItemId: itemId, requiredQty: 2 },
        ] }, 201);
        const execution = await data('post', `/api/protocols/animals/${animalId}/execute`, { protocolId: protocol.id, phaseNumber: 1 });
        movementId = execution.requiredInput.movementId;
        const costs = await data('get', `/api/reports/animals/${animalId}/costs`);
        expect(costs).toEqual({ animalId, totalCost: 0, movements: [{ movementId, itemId, itemName: 'Cost input', qty: 2, occurredAt: expect.any(String), estimatedCost: 0 }] });
        expect(await data('get', '/api/reports/stage-costs')).toEqual([{ phaseNumber: 1, phaseName: 'Diagnóstico', executions: 1, estimatedCost: 0 }]);
    });

    it('uses the mean unit price of linked purchases for animal and stage costs without changing stock', async () => {
        const stockBefore = await data('get', `/api/inventory/${itemId}`);
        await createPurchase({ description: 'Insumo precio 10', totalAmount: 100, itemId, quantity: 10 });
        await createPurchase({ description: 'Insumo precio 20', totalAmount: 40, itemId, quantity: 2 });
        const costs = await data('get', `/api/reports/animals/${animalId}/costs`);
        expect(costs).toEqual({ animalId, totalCost: 30, movements: [{ movementId, itemId, itemName: 'Cost input', qty: 2, occurredAt: expect.any(String), estimatedCost: 30 }] });
        expect(await data('get', '/api/reports/stage-costs')).toEqual([{ phaseNumber: 1, phaseName: 'Diagnóstico', executions: 1, estimatedCost: 30 }]);
        expect(await data('get', `/api/inventory/${itemId}`)).toEqual(stockBefore);
    });

    it('returns empty costs for an own animal with no consumption and 404 for foreign animals', async () => {
        const animal = await data('post', '/api/animals', { earTag: 'COST-2', sex: 'male' }, 201);
        expect(await data('get', `/api/reports/animals/${animal.id}/costs`)).toEqual({ animalId: animal.id, totalCost: 0, movements: [] });
        rejected(await api('get', `/api/reports/animals/${animalId}/costs`, undefined, tokenB), 404, 'NOT_FOUND');
        rejected(await api('get', `/api/reports/animals/${randomUUID()}/costs`), 404, 'NOT_FOUND');
        expect(await data('get', '/api/reports/stage-costs', undefined, 200, tokenB)).toEqual([]);
    });
});

describe('KPI summary', () => {
    it('aggregates seeded animals, consumption, purchases and executions', async () => {
        const result = await summary();
        expect(result).toEqual({
            animals: { total: 2, active: 2, byPhase: [{ phaseNumber: 1, phaseName: 'Diagnóstico', count: 1 }] },
            inventory: { lowStockItems: 1, expiredLots: 0, lowDoseLots: 0 },
            consumption: { movements: 1, totalUnits: 2 },
            purchases: { total: 255, paid: 107, pending: 148 }, executions: { total: 1 },
        });
    });

    it('applies inclusive date boundaries to purchases and consumption only', async () => {
        await createPurchase({ description: 'Old', totalAmount: 99, purchasedAt: '2000-01-01' });
        expect((await summary()).purchases.total).toBe(255);
        expect((await summary(`?from=${today}&to=${today}`)).consumption).toEqual({ movements: 1, totalUnits: 2 });
        const old = await summary('?from=2000-01-01&to=2000-01-01');
        expect(old.purchases).toEqual({ total: 99, paid: 0, pending: 99 });
        expect(old.consumption).toEqual({ movements: 0, totalUnits: 0 });
        expect(old.animals.total).toBe(2);
        expect(old.executions.total).toBe(1);
        expect((await summary('?from=2000-01-01')).purchases.total).toBe(354);
        expect((await summary('?to=2000-01-01')).purchases.total).toBe(99);
    });

    it('returns isolated zero counters for an empty tenant', async () => {
        expect(await data('get', '/api/reports/summary', undefined, 200, tokenB)).toEqual({
            animals: { total: 0, active: 0, byPhase: [] }, inventory: { lowStockItems: 0, expiredLots: 0, lowDoseLots: 0 },
            consumption: { movements: 0, totalUnits: 0 }, purchases: { total: 0, paid: 0, pending: 0 }, executions: { total: 0 },
        });
    });

    it('validates calendar dates and reversed intervals', async () => {
        for (const query of ['?from=invalid', '?to=2025-02-30', '?from=2025-02-02&to=2025-01-01']) {
            rejected(await api('get', `/api/reports/summary${query}`), 400, 'VALIDATION_ERROR');
        }
    });

    it('requires authentication on every new route before validation', async () => {
        for (const [method, path] of [
            ['post', '/api/purchases'], ['get', '/api/purchases'], ['get', '/api/purchases/invalid'],
            ['post', '/api/purchases/invalid/payments'], ['get', '/api/purchases/payables-summary'],
            ['get', '/api/reports/animals/invalid/costs'], ['get', '/api/reports/stage-costs'], ['get', '/api/reports/summary'],
        ]) rejected(await request(baseUrl)[method](path), 401, 'UNAUTHORIZED', 'MISSING_TOKEN');
    });
});
