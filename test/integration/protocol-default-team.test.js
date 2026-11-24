// Default team per phase (Fase 3, T3): a phase definition can carry a
// default team; executions use it when the caller sends no teamId.
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const SUFFIX = randomUUID();
let server;
let baseUrl;
let tokenA;
let teamId;
let protocolId;
let animalId;

beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const res = await request(baseUrl).post('/api/auth/register').send({
        tenantName: `Teams ${SUFFIX}`,
        slug: `teams-${SUFFIX}`,
        email: `owner-${SUFFIX}@teams.example`,
        password: 'secret-pass-123',
        displayName: 'Owner',
    });
    expect(res.status).toBe(201);
    tokenA = res.body.data.token;
    const api = (method, url, body) => request(baseUrl)[method](url)
        .set('Authorization', `Bearer ${tokenA}`).send(body);

    const team = await api('post', '/api/teams', { name: `Equipo A ${SUFFIX}` });
    expect(team.status).toBe(201);
    teamId = team.body.data.id;
});

afterAll(async () => {
    await stopServer(server);
});

const api = (method, url, body) => request(baseUrl)[method](url)
    .set('Authorization', `Bearer ${tokenA}`).send(body);

describe('default team per phase', () => {
    it('creates a protocol with a default team for a phase and uses it on execution', async () => {
        const created = await api('post', '/api/protocols', {
            name: `Con Equipo ${SUFFIX.slice(0, 8)}`,
            phases: [
                { phaseNumber: 1, name: 'Chequeo', defaultTeamId: teamId },
                { phaseNumber: 2, name: 'Preparo' },
            ],
        });
        expect(created.status).toBe(201);
        expect(created.body.data.phases[0].defaultTeamId).toBe(teamId);
        protocolId = created.body.data.id;

        const animal = await api('post', '/api/animals', {
            earTag: `T-${SUFFIX.slice(0, 8)}`, sex: 'female',
        });
        animalId = animal.body.data.id;

        const done = await api('post', `/api/protocols/animals/${animalId}/execute`, {
            protocolId, phaseNumber: 1,
        });
        expect(done.status).toBe(200);
        expect(done.body.data.teamId).toBe(teamId);
    });

    it('explicit teamId on execution overrides the phase default', async () => {
        const second = await api('post', '/api/teams', { name: `Equipo B ${SUFFIX}` });
        const otherTeamId = second.body.data.id;
        const done = await api('post', `/api/protocols/animals/${animalId}/execute`, {
            protocolId, phaseNumber: 2, teamId: otherTeamId,
        });
        expect(done.status).toBe(200);
        expect(done.body.data.teamId).toBe(otherTeamId);
    });

    it('rejects a default team from another tenant without mutation', async () => {
        const S2 = randomUUID();
        const resB = await request(baseUrl).post('/api/auth/register').send({
            tenantName: `Teams B ${S2}`,
            slug: `teams-b-${S2}`,
            email: `owner-${S2}@teams.example`,
            password: 'secret-pass-123',
            displayName: 'Owner B',
        });
        expect(resB.status).toBe(201);
        const tokenB = resB.body.data.token;
        const teamB = await request(baseUrl).post('/api/teams')
            .set('Authorization', `Bearer ${tokenB}`).send({ name: `Equipo B ${S2}` });
        expect(teamB.status).toBe(201);
        const res = await api('post', '/api/protocols', {
            name: `Equipo Ajeno ${SUFFIX.slice(0, 8)}`,
            phases: [{ phaseNumber: 1, name: 'Chequeo', defaultTeamId: teamB.body.data.id }],
        });
        expect(res.status).toBe(422);
        expect(res.body.error.details.reason).toBe('TEAM_NOT_IN_TENANT');
    });
});
