// Semen-lot phase consumption (Fase 3, T2): completing a phase whose
// required item is category 'semen' can consume doses from ONE specific lot;
// execution + lot deduction + item stock + ledger happen in ONE transaction.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;
let tokenA;
let tokenB;
let protocolId;
let animalId;
let semenItemId;
let lotId;
let otherLotId;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `LotPhase ${tenant}`,
            slug: `lotphase-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@lotphase.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
    const api = (method, url, body) => request(baseUrl)[method](url)
        .set('Authorization', `Bearer ${tokenA}`).send(body);

    const semen = await api('post', '/api/inventory', { name: `Semen F3 ${SUFFIX}`, category: 'semen' });
    semenItemId = semen.body.data.id;
    await api('post', `/api/inventory/${semenItemId}/stock`, { qty: 12 });

    // Custom protocol whose phase 3 requires the semen item.
    const created = await api('post', '/api/protocols', {
        name: `Cría Lotes ${SUFFIX.slice(0, 8)}`,
        phases: [
            { phaseNumber: 1, name: 'Chequeo' },
            { phaseNumber: 2, name: 'Preparo' },
            { phaseNumber: 3, name: 'Inseminación', requiredItemId: semenItemId, requiredQty: 1 },
            { phaseNumber: 4, name: 'Gestación' },
            { phaseNumber: 5, name: 'Preparto' },
            { phaseNumber: 6, name: 'Parto' },
            { phaseNumber: 7, name: 'Destete' },
        ],
    });
    expect(created.status).toBe(201);
    protocolId = created.body.data.id;

    const animal = await api('post', '/api/animals', {
        earTag: `LP-${SUFFIX.slice(0, 8)}`, sex: 'female', name: 'Trenza',
    });
    animalId = animal.body.data.id;

    // Phases 1 and 2 have no required input; complete them to reach phase 3.
    for (const phaseNumber of [1, 2]) {
        const done = await api('post', `/api/protocols/animals/${animalId}/execute`, {
            protocolId, phaseNumber,
        });
        expect(done.status).toBe(200);
    }

    const lot = await api('post', '/api/semen-lots', {
        itemId: semenItemId, lotCode: `F3A-${SUFFIX.slice(0, 8)}`, totalDoses: 10,
    });
    lotId = lot.body.data.id;
    const other = await api('post', '/api/semen-lots', {
        itemId: semenItemId, lotCode: `F3B-${SUFFIX.slice(0, 8)}`, totalDoses: 2,
    });
    otherLotId = other.body.data.id;
});

afterAll(async () => {
    await stopServer(server);
});

const api = (method, url, body, token = tokenA) => request(baseUrl)[method](url)
    .set('Authorization', `Bearer ${token}`).send(body);

const execute = (body) => api('post', `/api/protocols/animals/${animalId}/execute`, body);

describe('phase completion with a specific semen lot', () => {
    it('rejects consuming more doses than the lot has, without mutation', async () => {
        const beforeLot = await api('get', `/api/semen-lots/${otherLotId}`);
        const beforeItem = await api('get', `/api/inventory/${semenItemId}`);
        const res = await execute({ protocolId, phaseNumber: 3, semenLotId: otherLotId, doses: 99 });
        expect(res.status).toBe(422);
        expect(res.body.error.details.reason).toBe('NOT_ENOUGH_DOSES');
        const afterLot = await api('get', `/api/semen-lots/${otherLotId}`);
        const afterItem = await api('get', `/api/inventory/${semenItemId}`);
        expect(afterLot.body).toEqual(beforeLot.body);
        expect(afterItem.body).toEqual(beforeItem.body);
    });

    it('consumes the requested lot atomically: execution + lot + stock + ledger', async () => {
        const res = await execute({ protocolId, phaseNumber: 3, semenLotId: otherLotId, doses: 2 });
        expect(res.status).toBe(200);
        expect(res.body.data.requiredInput).toMatchObject({ lotId: otherLotId, qty: 2 });

        const lot = await api('get', `/api/semen-lots/${otherLotId}`);
        expect(lot.body.data.availableDoses).toBe(0);
        expect(lot.body.data.status).toBe('depleted');

        const item = await api('get', `/api/inventory/${semenItemId}`);
        expect(item.body.data.stockQty).toBe(10);
    });

    it('rejects unknown lot for the tenant without mutation', async () => {
        const before = await api('get', `/api/semen-lots/${lotId}`);
        const res = await request(baseUrl)
            .post(`/api/protocols/animals/${animalId}/execute`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ protocolId, phaseNumber: 3, semenLotId: lotId, doses: 1 });
        expect(res.status).toBe(404);
        const after = await api('get', `/api/semen-lots/${lotId}`);
        expect(after.body).toEqual(before.body);
    });
});
