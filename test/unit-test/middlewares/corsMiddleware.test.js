// corsMiddleware: same-origin policy as Electronica_Central_backend.
// The request origin must match FRONTEND_ORIGIN to receive CORS headers;
// OPTIONS short-circuits 204 for the allowed origin.
import { describe, it, expect, beforeAll } from 'vitest';

const REQUIRED_ENV = {
    JWT_SECRET: 'x'.repeat(32),
    BASE_URL: 'http://test.example',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:5/db',
};
process.env = { ...process.env, ...REQUIRED_ENV, FRONTEND_ORIGIN: 'https://front.example' };

let corsMiddleware;
let errorCodes;

beforeAll(async () => {
    ({ corsMiddleware } = await import('../../../src/middlewares/corsMiddleware.js'));
    ({ errorCodes } = await import('../../../src/config/errorCodes.js'));
});

const mockRes = () => {
    const headers = {};
    return {
        headers,
        statusCode: null,
        ended: false,
        setHeader: (key, value) => { headers[key.toLowerCase()] = value; },
        sendStatus: (code) => { statusCode: 0; },
        status: (code) => { statusCode = code; },
    };
};

describe('corsMiddleware', () => {
    it('sets CORS headers when the origin matches FRONTEND_ORIGIN', async () => {
        const headers = {};
        let nextCalled = false;
        const resWithSend = {
            setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
            sendStatus: (_code) => { resWithSend.ended = true; },
        };
        const req = { headers: { origin: 'https://front.example' }, method: 'GET' };
        const next = () => { nextCalled = true; };
        await new Promise((resolve) => {
            corsMiddleware(req, resWithSend, () => resolve(next()));
        });
        expect(headers['access-control-allow-origin']).toBe('https://front.example');
        expect(nextCalled).toBe(true);
    });

    it('sets no CORS headers and still forwards the request for an unknown origin', async () => {
        const headers = {};
        const res = { setHeader: (k, v) => { headers[k.toLowerCase()] = v; } };
        const req = { headers: { origin: 'https://other.example' }, method: 'GET' };
        const next = () => { req.forwarded = true; };
        await new Promise((resolve) => corsMiddleware(req, res, () => resolve(next())));
        expect(headers['access-control-allow-origin']).toBeUndefined();
        expect(req.forwarded).toBe(true);
    });

    it('answers OPTIONS with 204 for the allowed origin without calling next', () => {
        const headers = {};
        let ended = false;
        const res = {
            setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
            sendStatus: (code) => { ended = code === 204; },
        };
        const req = { headers: { origin: 'https://front.example' }, method: 'OPTIONS' };
        corsMiddleware(req, res, () => { throw new Error('next must not be called'); });
        expect(ended).toBe(true);
        expect(headers['access-control-allow-origin']).toBe('https://front.example');
    });

    it('forwards requests without an origin header (same-origin calls)', () => {
        let nextCalled = false;
        const res = { setHeader: () => {} };
        corsMiddleware({ headers: {}, method: 'GET' }, res, () => { nextCalled = true; });
        expect(nextCalled).toBe(true);
    });
});
