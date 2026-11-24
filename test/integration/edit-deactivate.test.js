// Edit and soft-delete of animals and inventory items (bloque T1).
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;
let tokenA;
let tokenB;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Edit ${tenant}`,
            slug: `edit-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@edit.example`,
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

describe('edit and deactivate animals', () => {
    it('updates editable fields and keeps the identity', async () => {
        const created = await api('post', '/api/animals', { earTag: `E-${SUFFIX.slice(0, 6)}`, sex: 'female' });
        expect(created.status).toBe(201);
        const id = created.body.data.id;

        const res = await api('put', `/api/animals/${id}`, {
            earTag: `E-${SUFFIX.slice(0, 6)}-B`,
            name: 'Corregida',
            breed: 'Nelore',
            notes: 'caravana corregida',
        });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            id,
            earTag: `E-${SUFFIX.slice(0, 6)}-B`,
            name: 'Corregida',
            breed: 'Nelore',
            notes: 'caravana corregida',
            status: 'active',
        });
    });

    it('rejects renaming to an existing active ear tag without mutation', async () => {
        const first = await api('post', '/api/animals', { earTag: `D-${SUFFIX.slice(0, 6)}`, sex: 'female' });
        const second = await api('post', '/api/animals', { earTag: `F-${SUFFIX.slice(0, 6)}`, sex: 'female' });
        const before = await api('get', `/api/animals/${second.body.data.id}`);

        const res = await api('put', `/api/animals/${second.body.data.id}`, {
            earTag: `d-${SUFFIX.slice(0, 6)}`,
        });
        expect(res.status).toBe(409);
        expect(res.body.error.details.reason).toBe('EAR_TAG_ALREADY_EXISTS');
        const after = await api('get', `/api/animals/${second.body.data.id}`);
        expect(after.body).toEqual(before.body);
        expect(first.status).toBe(201);
    });

    it('soft-deletes an animal and hides it from the list', async () => {
        const created = await api('post', '/api/animals', { earTag: `X-${SUFFIX.slice(0, 6)}`, sex: 'male' });
        const id = created.body.data.id;
        const del = await api('delete', `/api/animals/${id}`);
        expect(del.status).toBe(200);
        expect(del.body.data).toEqual({ id });
        const list = await api('get', '/api/animals');
        expect(list.body.data.some((a) => a.id === id)).toBe(false);
        const one = await api('get', `/api/animals/${id}`);
        expect(one.status).toBe(200);
        expect(one.body.data.status).toBe('deceased');
        const again = await api('delete', `/api/animals/${id}`);
        expect(again.status).toBe(422);
    });

    it('isolates tenants on update and delete', async () => {
        const created = await api('post', '/api/animals', { earTag: `T-${SUFFIX.slice(0, 6)}`, sex: 'female' });
        const id = created.body.data.id;
        // Another tenant cannot see the resource at all.
        const upd = await api('put', `/api/animals/${id}`, { name: 'ajeno' }, tokenB);
        expect(upd.status).toBe(404);
        const del = await api('delete', `/api/animals/${id}`, undefined, tokenB);
        expect(del.status).toBe(404);
        const mine = await api('get', `/api/animals/${id}`);
        expect(mine.body.data.name).toBeNull();
    });
});

describe('edit and deactivate inventory items', () => {
    it('updates name, unit, minimum and stage', async () => {
        const created = await api('post', '/api/inventory', { name: `Insumo ${SUFFIX.slice(0, 6)}`, category: 'supply' });
        const id = created.body.data.id;
        const res = await api('put', `/api/inventory/${id}`, {
            name: `Insumo ${SUFFIX.slice(0, 6)} v2`, unit: 'kg', minStock: 3, stage: 'engorde',
        });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ id, name: `Insumo ${SUFFIX.slice(0, 6)} v2`, unit: 'kg', minStock: 3, stage: 'engorde' });
    });

    it('soft-deletes an item and removes it from the listing', async () => {
        const created = await api('post', '/api/inventory', { name: `Baja ${SUFFIX.slice(0, 6)}`, category: 'supply' });
        const id = created.body.data.id;
        const del = await api('delete', `/api/inventory/${id}`);
        expect(del.status).toBe(200);
        const list = await api('get', '/api/inventory');
        expect(list.body.data.some((i) => i.id === id)).toBe(false);
        // Already deactivated: the item is no longer visible.
        const again = await api('delete', `/api/inventory/${id}`);
        expect(again.status).toBe(404);
    });

    it('requires authentication on every new route', async () => {
        const created = await api('post', '/api/animals', { earTag: `A-${SUFFIX.slice(0, 6)}`, sex: 'female' });
        const animalId = created.body.data.id;
        const item = await api('post', '/api/inventory', { name: `Auth ${SUFFIX.slice(0, 6)}`, category: 'supply' });
        for (const operation of [
            request(baseUrl).put(`/api/animals/${animalId}`).send({ name: 'x' }),
            request(baseUrl).delete(`/api/animals/${animalId}`),
            request(baseUrl).put(`/api/inventory/${item.body.data.id}`).send({ name: 'x' }),
            request(baseUrl).delete(`/api/inventory/${item.body.data.id}`),
        ]) {
            const res = await operation;
            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        }
    });
});
