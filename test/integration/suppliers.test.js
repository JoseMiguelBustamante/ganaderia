// Suppliers (Fase 2 / M2, T1): S2 HTTP/layer conventions, S3 tenant-scoped
// persistence, S4 RLS isolation, soft delete keeps rows.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
const supplier = { name: `Vet Central ${SUFFIX}`, contactName: 'Ana Ruiz', phone: '+595981123456', email: `ventas-${SUFFIX}@vetcentral.example` };
let server;
let baseUrl;
let tokenA;
let tokenB;
let supplierId;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Suppliers ${tenant}`,
            slug: `suppliers-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@suppliers.example`,
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

const list = (token = tokenA, query = {}) => request(baseUrl)
    .get('/api/suppliers').set('Authorization', `Bearer ${token}`).query(query);
const create = (body, token = tokenA) => request(baseUrl)
    .post('/api/suppliers').set('Authorization', `Bearer ${token}`).send(body);

describe('suppliers API', () => {
    it('creates a supplier and preserves it through list and get', async () => {
        const res = await create(supplier);
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({
            name: supplier.name,
            contactName: supplier.contactName,
            phone: supplier.phone,
            email: supplier.email,
            isActive: true,
        });
        expect(res.body.data.id).toEqual(expect.any(String));
        supplierId = res.body.data.id;
        const all = await list();
        expect(all.status).toBe(200);
        expect(all.body.data).toHaveLength(1);
        expect(all.body.data[0]).toMatchObject({ id: supplierId, name: supplier.name });
        const one = await request(baseUrl).get(`/api/suppliers/${supplierId}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(one.status).toBe(200);
        expect(one.body.data).toEqual(all.body.data[0]);
    });

    it('returns 404 NOT_FOUND for an unknown UUID', async () => {
        const res = await request(baseUrl).get(`/api/suppliers/${randomUUID()}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects a case-insensitive duplicate name without mutation', async () => {
        const before = await list();
        expect(before.status).toBe(200);
        const res = await create({ name: supplier.name.toLowerCase() });
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
        expect(res.body.error.details.reason).toBe('SUPPLIER_NAME_ALREADY_EXISTS');
        const after = await list();
        expect(after.body).toEqual(before.body);
    });

    it('rejects invalid email without mutation', async () => {
        const res = await create({ ...supplier, name: `Otra ${SUFFIX}`, email: 'not-an-email' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates contact fields without changing identity', async () => {
        const res = await request(baseUrl).put(`/api/suppliers/${supplierId}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ contactName: 'Luis Gomez', phone: '+595982000000' });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            id: supplierId,
            name: supplier.name,
            contactName: 'Luis Gomez',
            phone: '+595982000000',
        });
    });

    it('soft-deletes: deactivated supplier disappears from default list, stays by id', async () => {
        const extra = await create({ name: `Temporal ${SUFFIX}` });
        expect(extra.status).toBe(201);
        const del = await request(baseUrl).delete(`/api/suppliers/${extra.body.data.id}`)
            .set('Authorization', `Bearer ${tokenA}`);
        expect(del.status).toBe(200);
        expect(del.body.data).toEqual({ id: extra.body.data.id });
        const active = await list();
        expect(active.body.data.some((s) => s.id === extra.body.data.id)).toBe(false);
        const includingInactive = await list(tokenA, { activeOnly: 'false' });
        const gone = includingInactive.body.data.find((s) => s.id === extra.body.data.id);
        expect(gone).toMatchObject({ isActive: false });
    });

    it('isolates tenants: tenant B sees none of tenant A suppliers', async () => {
        const res = await list(tokenB);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
        const cross = await request(baseUrl).get(`/api/suppliers/${supplierId}`)
            .set('Authorization', `Bearer ${tokenB}`);
        expect(cross.status).toBe(404);
    });

    it('requires authentication for every suppliers route', async () => {
        for (const operation of [
            request(baseUrl).post('/api/suppliers').send(supplier),
            request(baseUrl).get('/api/suppliers'),
            request(baseUrl).get(`/api/suppliers/${supplierId}`),
            request(baseUrl).put(`/api/suppliers/${supplierId}`).send({ contactName: 'x' }),
            request(baseUrl).delete(`/api/suppliers/${supplierId}`),
        ]) {
            const res = await operation;
            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        }
    });
});
