// T5: S2 conventions, S3 isolation/atomic discount, S5 animal-linked inputs.
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
let inputId;
let protocolId;
let animalId;
const item = { name: 'Vacuna', category: 'vaccine', unit: 'dose', minStock: 2 };
const api = (method, path, body, token = tokenA) => {
    const operation = request(baseUrl)[method](path).set('Authorization', `Bearer ${token}`);
    return body === undefined ? operation : operation.send(body);
};
const reject = (res, status, code, reason) => {
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    if (reason) expect(res.body.error.details.reason).toBe(reason);
};
const execute = (phaseNumber, token = tokenA, id = protocolId) => api(
    'post', `/api/protocols/animals/${animalId}/execute`,
    { protocolId: id, phaseNumber, notes: 'Control realizado' }, token,
);
const executions = (token = tokenA) => api('get', `/api/protocols/animals/${animalId}/executions`, undefined, token);
const stock = (id) => api('get', `/api/inventory/${id}`);

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Protocols ${tenant}`, slug: `protocols-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@protocols.example`, password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        expect(res.body.data.token).toEqual(expect.any(String));
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
});
afterAll(async () => { await stopServer(server); });

describe('protocol engine API', () => {
    it('creates, lists and reads inventory and rejects invalid or duplicate items without mutation', async () => {
        const created = await api('post', '/api/inventory', item);
        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ ...item, stockQty: 0, isActive: true });
        itemId = created.body.data.id;
        const before = await api('get', '/api/inventory');
        expect(before.status).toBe(200);
        expect(before.body.data).toHaveLength(1);
        const one = await stock(itemId);
        expect(one.status).toBe(200);
        expect(one.body.data).toEqual(before.body.data[0]);
        reject(await api('post', '/api/inventory', { ...item, category: 'other' }), 400, 'VALIDATION_ERROR');
        reject(await api('post', '/api/inventory', item), 409, 'CONFLICT', 'ITEM_NAME_ALREADY_EXISTS');
        expect((await api('get', '/api/inventory')).body).toEqual(before.body);
        reject(await stock(randomUUID()), 404, 'NOT_FOUND');
    });

    it('adds positive stock and rejects zero without mutation', async () => {
        const added = await api('post', `/api/inventory/${itemId}/stock`, { qty: 5 });
        expect(added.status).toBe(200);
        expect(added.body.data.stockQty).toBe(5);
        const before = await stock(itemId);
        expect(before.status).toBe(200);
        reject(await api('post', `/api/inventory/${itemId}/stock`, { qty: 0 }), 400, 'VALIDATION_ERROR');
        const after = await stock(itemId);
        expect(after.status).toBe(200);
        expect(after.body).toEqual(before.body);
    });

    it('creates ordered phases and rejects duplicates, descending phases and unmatched input quantity', async () => {
        const input = await api('post', '/api/inventory', { name: 'Sincronizador', category: 'supply' });
        expect(input.status).toBe(201);
        expect(input.body.data).toMatchObject({ unit: 'unit', stockQty: 0, minStock: 0 });
        inputId = input.body.data.id;
        const phases = [
            { phaseNumber: 1, name: 'Diagnóstico' },
            { phaseNumber: 2, name: 'Examen clínico' },
            { phaseNumber: 3, name: 'Sincronización', requiredItemId: inputId, requiredQty: 1 },
        ];
        const body = { name: 'Protocolo base', phases };
        const res = await api('post', '/api/protocols', body);
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe(body.name);
        expect(res.body.data.phases).toHaveLength(3);
        phases.forEach((phase, index) => expect(res.body.data.phases[index]).toMatchObject(phase));
        protocolId = res.body.data.id;
        reject(await api('post', '/api/protocols', body), 409, 'CONFLICT', 'PROTOCOL_NAME_ALREADY_EXISTS');
        const descending = { name: 'Orden inválido', phases: [phases[2], phases[0]] };
        reject(await api('post', '/api/protocols', descending), 422, 'BUSINESS_RULE', 'PHASES_MUST_BE_UNIQUE_AND_ASCENDING_1_7');
        // Repeating the same failed creation must not leave a conflicting definition behind.
        reject(await api('post', '/api/protocols', descending), 422, 'BUSINESS_RULE', 'PHASES_MUST_BE_UNIQUE_AND_ASCENDING_1_7');
        for (const phase of [
            { phaseNumber: 1, name: 'Inválida', requiredQty: 1 },
            { phaseNumber: 1, name: 'Inválida', requiredItemId: inputId },
        ]) {
            reject(await api('post', '/api/protocols', { name: 'Entrada inválida', phases: [phase] }), 400, 'VALIDATION_ERROR');
        }
    });

    it('enforces sequence and discounts inputs atomically only on successful completion', async () => {
        const animal = await api('post', '/api/animals', { earTag: `P-${SUFFIX}`, sex: 'female' });
        expect(animal.status).toBe(201);
        animalId = animal.body.data.id;
        reject(await execute(2), 422, 'BUSINESS_RULE', 'PHASE_OUT_OF_SEQUENCE');
        reject(await executions(), 404, 'NOT_FOUND');
        const first = await execute(1);
        expect(first.status).toBe(200);
        expect(first.body.data).toMatchObject({ animalId, protocolId, phaseNumber: 1, requiredInput: null });
        const before = await executions();
        expect(before.status).toBe(200);
        reject(await execute(3), 422, 'BUSINESS_RULE', 'PHASE_OUT_OF_SEQUENCE');
        expect((await executions()).body).toEqual(before.body);
        expect((await stock(inputId)).body.data.stockQty).toBe(0);
        expect((await execute(2)).status).toBe(200);
        const beforeFailure = await executions();
        const stockBefore = await stock(inputId);
        expect(beforeFailure.status).toBe(200);
        expect(stockBefore.status).toBe(200);
        reject(await execute(3), 422, 'BUSINESS_RULE', 'INSUFFICIENT_STOCK');
        const afterFailure = await executions();
        const stockAfter = await stock(inputId);
        expect(afterFailure.status).toBe(200);
        expect(stockAfter.status).toBe(200);
        expect(afterFailure.body).toEqual(beforeFailure.body);
        expect(stockAfter.body).toEqual(stockBefore.body);
        const added = await api('post', `/api/inventory/${inputId}/stock`, { qty: 3 });
        expect(added.status).toBe(200);
        expect(added.body.data.stockQty).toBe(3);
        const third = await execute(3);
        expect(third.status).toBe(200);
        expect(third.body.data).toMatchObject({
            animalId, protocolId, phaseNumber: 3, teamId: null,
            requiredInput: { itemId: inputId, qty: 1, movementId: expect.any(String) },
        });
        expect(Number.isNaN(Date.parse(third.body.data.executedAt))).toBe(false);
        const finalStock = await stock(inputId);
        expect(finalStock.status).toBe(200);
        expect(finalStock.body.data.stockQty).toBe(2);
        const completed = await executions();
        expect(completed.status).toBe(200);
        expect(completed.body.data.map((row) => row.phase_number)).toEqual([1, 2, 3]);
        for (const [phase, reason] of [[3, 'PHASE_ALREADY_COMPLETED'], [4, 'PHASE_NOT_FOUND']]) {
            reject(await execute(phase), 422, 'BUSINESS_RULE', reason);
            expect((await executions()).body).toEqual(completed.body);
            expect((await stock(inputId)).body).toEqual(finalStock.body);
        }
    });

    it('isolates animal execution and history across tenants', async () => {
        const own = await api('post', '/api/protocols', {
            name: 'Protocolo B', phases: [{ phaseNumber: 1, name: 'Diagnóstico' }],
        }, tokenB);
        expect(own.status).toBe(201);
        const before = await executions();
        const beforeStock = await stock(inputId);
        expect(before.status).toBe(200);
        expect(beforeStock.status).toBe(200);
        reject(await execute(1, tokenB, own.body.data.id), 422, 'BUSINESS_RULE', 'ANIMAL_NOT_IN_TENANT');
        reject(await executions(tokenB), 404, 'NOT_FOUND');
        expect((await executions()).body).toEqual(before.body);
        expect((await stock(inputId)).body).toEqual(beforeStock.body);
    });

    it('authenticates every new route before validating input', async () => {
        for (const [method, path] of [
            ['post', '/api/inventory'], ['post', '/api/inventory/invalid/stock'],
            ['get', '/api/inventory/invalid'], ['get', '/api/inventory'],
            ['post', '/api/protocols'], ['post', '/api/protocols/animals/invalid/execute'],
            ['get', '/api/protocols/animals/invalid/executions'],
        ]) {
            reject(await request(baseUrl)[method](path), 401, 'UNAUTHORIZED', 'MISSING_TOKEN');
        }
    });
});
