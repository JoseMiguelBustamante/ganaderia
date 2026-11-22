// Animals (T4): S2 HTTP/layer conventions and S3 tenant-scoped persistence.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
const animal = { earTag: `A-${SUFFIX}`, sex: 'female', name: 'Fortuna' };
let server;
let baseUrl;
let tokenA;
let tokenB;
let animalId;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Animals ${tenant}`,
            slug: `animals-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@animals.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        expect(res.body.data.token).toEqual(expect.any(String));
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
});

afterAll(async () => {
    await stopServer(server);
});

const list = (token = tokenA, query = {}) => request(baseUrl)
    .get('/api/animals').set('Authorization', `Bearer ${token}`).query(query);
const create = (body, token = tokenA) => request(baseUrl)
    .post('/api/animals').set('Authorization', `Bearer ${token}`).send(body);

async function expectRejectedWithoutMutation(body, status, code, reason) {
    const before = await list();
    expect(before.status).toBe(200);
    const res = await create(body);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    if (reason) expect(res.body.error.details.reason).toBe(reason);
    const after = await list();
    expect(after.status).toBe(200);
    expect(after.body).toEqual(before.body);
}

describe('animals API', () => {
    it('creates an active animal and preserves it through list and get', async () => {
        const res = await create(animal);
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ ...animal, status: 'active' });
        expect(res.body.data.id).toEqual(expect.any(String));
        animalId = res.body.data.id;
        const all = await list();
        expect(all.status).toBe(200);
        expect(all.body.data).toHaveLength(1);
        expect(all.body.data[0]).toMatchObject({ id: animalId, ear_tag: animal.earTag, sex: 'female', status: 'active' });
        const one = await request(baseUrl).get(`/api/animals/${animalId}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(one.status).toBe(200);
        expect(one.body.data).toEqual(all.body.data[0]);
    });

    it('returns 404 NOT_FOUND for an unknown UUID', async () => {
        const res = await request(baseUrl).get(`/api/animals/${randomUUID()}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects a case-insensitive active ear tag duplicate without mutation', async () => {
        await expectRejectedWithoutMutation(
            { ...animal, earTag: animal.earTag.toLowerCase() },
            409, 'CONFLICT', 'EAR_TAG_ALREADY_EXISTS',
        );
    });

    it('rejects invalid sex without mutation', async () => {
        await expectRejectedWithoutMutation({ ...animal, sex: 'other' }, 400, 'VALIDATION_ERROR');
    });

    it('rejects a future birth date without mutation', async () => {
        await expectRejectedWithoutMutation({ ...animal, birthDate: '2999-01-01' }, 400, 'VALIDATION_ERROR');
    });

    it('requires authentication for every animals route', async () => {
        const before = await list();
        expect(before.status).toBe(200);
        for (const operation of [
            request(baseUrl).post('/api/animals').send(animal),
            request(baseUrl).get('/api/animals'),
            request(baseUrl).get(`/api/animals/${animalId}`),
        ]) {
            const res = await operation;
            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
            expect(res.body.error.details.reason).toBe('MISSING_TOKEN');
        }
        const after = await list();
        expect(after.status).toBe(200);
        expect(after.body).toEqual(before.body);
    });

    it('isolates the second tenant for list and direct ID reads', async () => {
        const all = await list(tokenB);
        expect(all.status).toBe(200);
        expect(all.body).toEqual({ data: [] });
        const one = await request(baseUrl).get(`/api/animals/${animalId}`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect(one.status).toBe(404);
        expect(one.body.error.code).toBe('NOT_FOUND');
    });

    it('filters by ear tag, name and chip serial without changing unfiltered listing', async () => {
        const before = await list();
        expect(before.status).toBe(200);
        for (const search of [animal.earTag.toLowerCase(), 'fortuna']) {
            const res = await list(tokenA, { search });
            expect(res.status).toBe(200);
            expect(res.body).toEqual(before.body);
        }
        const miss = await list(tokenA, { search: 'no-match' });
        expect(miss.status).toBe(200);
        expect(miss.body).toEqual({ data: [] });
        const chip = `chip-${SUFFIX}`;
        const created = await create({ earTag: `B-${SUFFIX}`, sex: 'male', chipSerial: chip });
        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ chipSerial: chip, sex: 'male', status: 'active' });
        const found = await list(tokenA, { search: chip.toUpperCase() });
        expect(found.status).toBe(200);
        expect(found.body.data).toHaveLength(1);
        expect(found.body.data[0].id).toBe(created.body.data.id);
    });

    it('rejects invalid query and path parameters', async () => {
        const query = await list(tokenA, { search: '' });
        expect(query.status).toBe(400);
        expect(query.body.error.code).toBe('VALIDATION_ERROR');
        const params = await request(baseUrl).get('/api/animals/not-a-uuid')
            .set('Authorization', `Bearer ${tokenA}`);
        expect(params.status).toBe(400);
        expect(params.body.error.code).toBe('VALIDATION_ERROR');
    });
});
