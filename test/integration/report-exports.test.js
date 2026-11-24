// CSV exports (operar con confianza, T2): purchases and stock movements.
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
            tenantName: `Export ${tenant}`,
            slug: `export-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@export.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;

    const hoy = new Date().toISOString().slice(0, 10);
    const compra = await request(baseUrl).post('/api/purchases')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ description: 'Semen "Ajax" — 20 dosis', totalAmount: 4800000, purchasedAt: hoy });
    expect(compra.status).toBe(201);

    const item = await request(baseUrl).post('/api/inventory')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: `Insumo export ${SUFFIX.slice(0, 6)}`, category: 'supply' });
    await request(baseUrl).post(`/api/inventory/${item.body.data.id}/stock`)
        .set('Authorization', `Bearer ${tokenA}`).send({ qty: 5 });
});

afterAll(async () => {
    await stopServer(server);
});

const descargar = (ruta, token = tokenA) => request(baseUrl).get(ruta)
    .set('Authorization', `Bearer ${token}`);

describe('CSV exports', () => {
    it('exports purchases as CSV with headers, quoted fields and a filename', async () => {
        const res = await descargar('/api/reports/export/purchases.csv');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment');
        expect(res.headers['content-disposition']).toContain('compras.csv');

        const [header, ...rows] = res.text.split('\r\n');
        expect(header).toBe('"fecha","descripcion","proveedor","total","pagado","estado","vencimiento"');
        expect(rows).toHaveLength(1);
        // Inner quotes are doubled per RFC 4180.
        expect(rows[0]).toContain('"Semen ""Ajax"" — 20 dosis"');
        expect(rows[0]).toContain('4800000');
        expect(rows[0]).toMatch(/^"\d{4}-\d{2}-\d{2}"/);
        expect(rows[0]).toContain('"pending"');
    });

    it('exports stock movements as CSV', async () => {
        const res = await descargar('/api/reports/export/consumption.csv');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        const [header, ...rows] = res.text.split('\r\n');
        expect(header).toBe('"fecha","insumo","categoria","cantidad","motivo","caravana"');
        expect(rows).toHaveLength(1);
        expect(rows[0]).toContain('"5.000"');
        expect(rows[0]).toContain('"stock_addition"');
    });

    it('filters by range: a past-only window returns headers with no rows', async () => {
        const res = await descargar('/api/reports/export/purchases.csv?from=2020-01-01&to=2020-01-31');
        expect(res.status).toBe(200);
        const [header, ...rows] = res.text.split('\r\n');
        expect(header).toContain('descripcion');
        expect(rows).toHaveLength(0);
    });

    it('rejects an inverted range with VALIDATION_ERROR', async () => {
        const res = await descargar('/api/reports/export/purchases.csv?from=2026-05-01&to=2026-01-01');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('isolates tenants: another tenant exports only its own (empty) rows', async () => {
        const res = await descargar('/api/reports/export/purchases.csv', tokenB);
        expect(res.status).toBe(200);
        const rows = res.text.split('\r\n').slice(1);
        expect(rows).toHaveLength(0);
    });

    it('requires authentication', async () => {
        for (const ruta of ['/api/reports/export/purchases.csv', '/api/reports/export/consumption.csv']) {
            const res = await request(baseUrl).get(ruta);
            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHORIZED');
        }
    });
});
