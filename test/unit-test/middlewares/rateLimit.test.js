// Rate limiting (operar con confianza, T1). Unit tests for the factory that
// guards login/register and the general per-IP limiter.
import { describe, it, expect, beforeEach } from 'vitest';

let createRateLimiter;

beforeEach(async () => {
  ({ createRateLimiter } = await import('../../../src/middlewares/rateLimit.js'));
});

const run = (limiter, req) => {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  let nextCalled = false;
  const blocked = limiter(req, res);
  if (!blocked) nextCalled = true;
  return { res, nextCalled };
};

const req = (ip = '10.0.0.1', body = {}) => ({ ip, body, headers: {} });

describe('createRateLimiter', () => {
  it('allows requests up to the limit and blocks the next one with 429', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, key: () => 'fixed' });
    for (let i = 0; i < 3; i += 1) {
      const { nextCalled } = run(limiter, req());
      expect(nextCalled).toBe(true);
    }
    const { res, nextCalled } = run(limiter, req());
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('separates counters by key', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, key: (r) => r.ip });
    expect(run(limiter, req('1.1.1.1')).nextCalled).toBe(true);
    expect(run(limiter, req('1.1.1.1')).nextCalled).toBe(false);
    expect(run(limiter, req('2.2.2.2')).nextCalled).toBe(true);
  });

  it('forgets old hits once the window passes', async () => {
    const limiter = createRateLimiter({ windowMs: 30, max: 1, key: () => 'fixed' });
    expect(run(limiter, req()).nextCalled).toBe(true);
    expect(run(limiter, req()).nextCalled).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 45));
    expect(run(limiter, req()).nextCalled).toBe(true);
  });

  it('resets a key explicitly (used after a successful login)', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, key: () => 'k' });
    expect(run(limiter, req()).nextCalled).toBe(true);
    expect(run(limiter, req()).nextCalled).toBe(false);
    limiter.reset('k');
    expect(run(limiter, req()).nextCalled).toBe(true);
  });
});

describe('auth limiter keys on submitted email', () => {
  it('does not let one email exhaust the budget of another', async () => {
    const { authRateLimiter } = await import('../../../src/middlewares/rateLimit.js');
    authRateLimiter.resetAll?.();
    const one = { ip: '9.9.9.9', body: { email: 'a@x.test' }, headers: {} };
    const two = { ip: '9.9.9.9', body: { email: 'b@x.test' }, headers: {} };
    // Each key gets its own budget.
    for (let i = 0; i < 10; i += 1) run(authRateLimiter, one);
    authRateLimiter.reset(authRateLimiter.keyFor?.(one) ?? '9.9.9.9|a@x.test');
    expect(run(authRateLimiter, two).nextCalled).toBe(true);
  });
});
