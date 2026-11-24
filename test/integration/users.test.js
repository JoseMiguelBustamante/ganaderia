import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startServer, stopServer } from './helpers/node-server.js';

const suffix = randomUUID();
const password = 'secret-pass-123';
let server, baseUrl, owner, other, operator, manager;
const api = (method, path, body, token = owner.token) => request(baseUrl)[method](path)
    .set('Authorization', `Bearer ${token}`).send(body);
const input = (name, role = 'operator') => ({ email: `${name}-${suffix}@users.example`, password, displayName: name, role });
const login = (email, pass = password) => request(baseUrl).post('/api/auth/login').send({ email, password: pass });
const error = (res, status, code, reason) => {
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    if (reason) expect(res.body.error.details.reason).toBe(reason);
};
const list = async () => {
    const res = await api('get', '/api/users');
    expect(res.status).toBe(200);
    return res.body;
};
beforeAll(async () => {
    ({ server, baseUrl } = await startServer());
    const sessions = [];
    for (const name of ['a', 'b']) {
        const res = await request(baseUrl).post('/api/auth/register').send({
            tenantName: name, slug: `users-${name}-${suffix}`, ...input(`owner-${name}`),
        });
        expect(res.status).toBe(201);
        sessions.push(res.body.data);
    }
    [owner, other] = sessions;
});
afterAll(async () => { await stopServer(server); });

describe('tenant users', () => {
    it('owner creates an operator who can log in without exposing hashes', async () => {
        const res = await api('post', '/api/users', input('operator'));
        expect(res.status).toBe(201);
        expect(res.body.data).toMatchObject({ email: input('operator').email, role: 'operator', isActive: true, teamId: null });
        expect(JSON.stringify(res.body)).not.toContain('password');
        const session = await login(input('operator').email);
        expect(session.status).toBe(200);
        operator = session.body.data;
    });
    it('operator cannot create, list or deactivate users, without mutation', async () => {
        const before = await list();
        error(await api('post', '/api/users', input('denied'), operator.token), 403, 'FORBIDDEN');
        error(await api('get', '/api/users', undefined, operator.token), 403, 'FORBIDDEN');
        error(await api('delete', `/api/users/${owner.user.id}`, undefined, operator.token), 403, 'FORBIDDEN');
        expect(await list()).toEqual(before);
    });
    it('rejects duplicate tenant email case-insensitively, permits it in another tenant', async () => {
        const before = await list();
        error(await api('post', '/api/users', { ...input('operator'), email: input('operator').email.toUpperCase() }), 409, 'CONFLICT', 'EMAIL_ALREADY_EXISTS');
        expect(await list()).toEqual(before);
        const res = await api('post', '/api/users', input('operator'), other.token);
        expect(res.status).toBe(201);
        expect(res.body.data.tenantId).toBe(other.tenant.id);
    });
    it('soft deletion hides a user and login returns 401 INVALID_CREDENTIALS', async () => {
        const created = await api('post', '/api/users', input('inactive'));
        expect(created.status).toBe(201);
        expect((await login(input('inactive').email)).status).toBe(200);
        const res = await api('delete', `/api/users/${created.body.data.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: { id: created.body.data.id } });
        expect((await list()).data.some(u => u.id === created.body.data.id)).toBe(false);
        error(await login(input('inactive').email), 401, 'UNAUTHORIZED', 'INVALID_CREDENTIALS');
    });
    it('protects the last owner, allows deletion with a second owner', async () => {
        const before = await list();
        error(await api('delete', `/api/users/${owner.user.id}`), 422, 'BUSINESS_RULE', 'LAST_OWNER');
        expect(await list()).toEqual(before);
        expect((await login(input('owner-a').email)).status).toBe(200);
        const second = await api('post', '/api/users', input('second-owner', 'owner'));
        expect(second.status).toBe(201);
        expect((await api('delete', `/api/users/${second.body.data.id}`)).status).toBe(200);
        error(await api('delete', `/api/users/${owner.user.id}`), 422, 'BUSINESS_RULE', 'LAST_OWNER');
    });
    it('owner reset replaces the password and preserves the user list', async () => {
        const before = await list();
        const res = await api('post', `/api/users/${operator.user.id}/password`, { password: 'replacement-pass' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: { id: operator.user.id } });
        error(await login(input('operator').email), 401, 'UNAUTHORIZED', 'INVALID_CREDENTIALS');
        expect((await login(input('operator').email, 'replacement-pass')).status).toBe(200);
        expect(await list()).toEqual(before);
    });
    it('cross-tenant reset and deletion return 404 without mutation', async () => {
        const before = await list();
        for (const method of ['post', 'delete']) {
            error(await api(method, `/api/users/${other.user.id}${method === 'post' ? '/password' : ''}`, method === 'post' ? { password: 'intruder-pass' } : undefined), 404, 'NOT_FOUND', 'USER_NOT_IN_TENANT');
        }
        expect((await login(input('owner-b').email)).status).toBe(200);
        error(await login(input('owner-b').email, 'intruder-pass'), 401, 'UNAUTHORIZED');
        expect(await list()).toEqual(before);
    });
    it('manager can create and list but cannot create an owner', async () => {
        expect((await api('post', '/api/users', input('manager', 'manager'))).status).toBe(201);
        manager = (await login(input('manager').email)).body.data;
        const before = await list();
        error(await api('post', '/api/users', input('forbidden-owner', 'owner'), manager.token), 403, 'FORBIDDEN');
        expect(await list()).toEqual(before);
        expect((await api('post', '/api/users', input('vet', 'vet'), manager.token)).status).toBe(201);
        expect((await api('get', '/api/users', undefined, manager.token)).body).toEqual(await list());
    });
    it('non-owner resets only their own password, including manager', async () => {
        for (const session of [operator, manager]) {
            error(await api('post', `/api/users/${owner.user.id}/password`, { password: 'forbidden-pass' }, session.token), 403, 'FORBIDDEN');
            const res = await api('post', `/api/users/${session.user.id}/password`, { password: 'self-service-pass' }, session.token);
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ data: { id: session.user.id } });
            expect((await login(session.user.email, 'self-service-pass')).status).toBe(200);
        }
        expect((await login(input('owner-a').email)).status).toBe(200);
    });
    it('validates optional team tenant and preserves rejected input', async () => {
        const team = await api('post', '/api/teams', { name: `users-${suffix}` });
        expect(team.status).toBe(201);
        const created = await api('post', '/api/users', { ...input('team-member'), teamId: team.body.data.id });
        expect(created.status).toBe(201);
        expect(created.body.data.teamId).toBe(team.body.data.id);
        const before = await list();
        error(await api('post', '/api/users', { ...input('foreign-team'), teamId: team.body.data.id }, other.token), 422, 'BUSINESS_RULE', 'TEAM_NOT_IN_TENANT');
        expect(await list()).toEqual(before);
        error(await login(input('foreign-team').email), 401, 'UNAUTHORIZED');
    });
    it('rejects invalid roles, passwords and ids without mutation', async () => {
        const before = await list();
        for (const body of [{ ...input('invalid'), role: 'admin' }, { ...input('invalid'), password: 'short' }]) {
            error(await api('post', '/api/users', body), 400, 'VALIDATION_ERROR');
        }
        error(await api('post', `/api/users/${owner.user.id}/password`, { password: 'short' }), 400, 'VALIDATION_ERROR');
        error(await api('delete', '/api/users/not-a-uuid'), 400, 'VALIDATION_ERROR');
        expect(await list()).toEqual(before);
        expect((await login(input('owner-a').email)).status).toBe(200);
    });
    it('requires authentication for every new route without mutation', async () => {
        const before = await list();
        for (const [method, path, body] of [
            ['get', '/api/users'], ['post', '/api/users', input('anonymous')],
            ['delete', `/api/users/${owner.user.id}`],
            ['post', `/api/users/${owner.user.id}/password`, { password: 'anonymous-pass' }],
        ]) {
            error(await request(baseUrl)[method](path).send(body), 401, 'UNAUTHORIZED', 'MISSING_TOKEN');
        }
        expect(await list()).toEqual(before);
        expect((await login(input('owner-a').email)).status).toBe(200);
    });
});
