// Inventory stage catalog (Fase 2 / M2, T2): items can be tagged with the
// cattle stage they serve and the listing filters by stage.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;
let tokenA;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const res = await request(baseUrl).post('/api/auth/register').send({
        tenantName: `Stages ${SUFFIX}`,
        slug: `stages-${SUFFIX}`,
        email: `owner-${SUFFIX}@stages.example`,
        password: 'secret-pass-123',
        displayName: 'Owner',
    });
    expect(res.status).toBe(201);
    tokenA = res.body.data.token;
});

afterAll(async () => {
    await stopServer(server);
});

const api = (method, url, body) => request(baseUrl)[method](url)
    .set('Authorization', `Bearer ${tokenA}`)
    .send(body);

describe('inventory stage catalog API', () => {
    it('creates items with a stage and filters the listing by stage', async () => {
        const created = await api('post', '/api/inventory', {
            name: `Vacuna Chequeo ${SUFFIX}`,
            category: 'vaccine',
            stage: 'chequeo',
        });
        expect(created.status).toBe(201);
        expect(created.body.data.stage).toBe('chequeo');

        await api('post', '/api/inventory', {
            name: `Dosis Celulas ${SUFFIX}`,
            category: 'semen',
            stage: 'inseminacion',
        });
        await api('post', '/api/inventory', {
            name: `Sin Etapa ${SUFFIX}`,
            category: 'supply',
        });

        const all = await api('get', '/api/inventory');
        expect(all.status).toBe(200);
        expect(all.body.data).toHaveLength(3);
        const untagged = all.body.data.find((i) => i.name === `Sin Etapa ${SUFFIX}`);
        expect(untagged.stage).toBeNull();

        const chequeo = await api('get', '/api/inventory?stage=chequeo');
        expect(chequeo.status).toBe(200);
        expect(chequeo.body.data).toHaveLength(1);
        expect(chequeo.body.data[0]).toMatchObject({ name: `Vacuna Chequeo ${SUFFIX}`, stage: 'chequeo' });

        const inseminacion = await api('get', '/api/inventory?stage=inseminacion');
        expect(inseminacion.body.data).toHaveLength(1);
        expect(inseminacion.body.data[0].name).toBe(`Dosis Celulas ${SUFFIX}`);

        const empty = await api('get', '/api/inventory?stage=engorde');
        expect(empty.status).toBe(200);
        expect(empty.body.data).toHaveLength(0);
    });

    it('rejects an unknown stage without mutation', async () => {
        const before = await api('get', '/api/inventory');
        const res = await api('post', '/api/inventory', {
            name: `Mala Etapa ${SUFFIX}`,
            category: 'supply',
            stage: 'no-existe',
        });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        const after = await api('get', '/api/inventory');
        expect(after.body).toEqual(before.body);
    });
});
