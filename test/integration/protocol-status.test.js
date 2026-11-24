// Protocol status per animal (Fase 3, T4): one GET returns the phases of the
// protocol with their state (completed / current / pending), the execution
// history with consumed inputs, ready for the animal card UI.
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

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const tokens = [];
    for (const tenant of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Status ${tenant}`,
            slug: `status-${tenant}-${SUFFIX}`,
            email: `${tenant}-${SUFFIX}@status.example`,
            password: 'secret-pass-123',
            displayName: `Owner ${tenant}`,
        });
        expect(res.status).toBe(201);
        tokens.push(res.body.data.token);
    }
    [tokenA, tokenB] = tokens;
    const api = (method, url, body) => request(baseUrl)[method](url)
        .set('Authorization', `Bearer ${tokenA}`).send(body);

    const created = await api('post', '/api/protocols', {
        name: `Estado ${SUFFIX.slice(0, 8)}`,
        phases: [
            { phaseNumber: 1, name: 'Chequeo' },
            { phaseNumber: 2, name: 'Preparo' },
            { phaseNumber: 3, name: 'Inseminación' },
        ],
    });
    expect(created.status).toBe(201);
    protocolId = created.body.data.id;

    const animal = await api('post', '/api/animals', {
        earTag: `S-${SUFFIX.slice(0, 8)}`, sex: 'female', name: 'Luna',
    });
    animalId = animal.body.data.id;

    const first = await api('post', `/api/protocols/animals/${animalId}/execute`, {
        protocolId, phaseNumber: 1, notes: 'sin novedad',
    });
    expect(first.status).toBe(200);
});

afterAll(async () => {
    await stopServer(server);
});

const api = (method, url, body, token = tokenA) => request(baseUrl)[method](url)
    .set('Authorization', `Bearer ${token}`).send(body);

describe('protocol status per animal API', () => {
    it('returns phases with state: completed, current, pending', async () => {
        const res = await api('get', `/api/protocols/animals/${animalId}/status?protocolId=${protocolId}`);
        expect(res.status).toBe(200);
        const { protocol, animal, phases } = res.body.data;
        expect(protocol.id).toBe(protocolId);
        expect(animal.id).toBe(animalId);
        expect(phases).toHaveLength(3);
        expect(phases[0]).toMatchObject({ phaseNumber: 1, name: 'Chequeo', state: 'completed' });
        expect(phases[0].executedAt).toEqual(expect.any(String));
        expect(phases[1]).toMatchObject({ phaseNumber: 2, name: 'Preparo', state: 'current' });
        expect(phases[2]).toMatchObject({ phaseNumber: 3, name: 'Inseminación', state: 'pending' });
    });

    it('marks everything pending before any execution', async () => {
        const other = await api('post', '/api/animals', {
            earTag: `S2-${SUFFIX.slice(0, 8)}`, sex: 'female',
        });
        const res = await api('get', `/api/protocols/animals/${other.body.data.id}/status?protocolId=${protocolId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.phases[0].state).toBe('current');
        expect(res.body.data.phases[1].state).toBe('pending');
        expect(res.body.data.phases[2].state).toBe('pending');
    });

    it('isolates tenants: another tenant gets 404 for the same animal', async () => {
        const res = await api('get', `/api/protocols/animals/${animalId}/status?protocolId=${protocolId}`, undefined, tokenB);
        expect(res.status).toBe(404);
    });

    it('rejects an unknown protocolId with 404', async () => {
        const res = await api('get', `/api/protocols/animals/${animalId}/status?protocolId=${randomUUID()}`);
        expect(res.status).toBe(404);
    });

    it('requires authentication', async () => {
        const res = await request(baseUrl).get(`/api/protocols/animals/${animalId}/status?protocolId=${protocolId}`);
        expect(res.status).toBe(401);
    });
});
