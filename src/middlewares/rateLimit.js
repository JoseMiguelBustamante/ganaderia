// Request throttling without extra dependencies: a fixed-window counter per
// key. Two instances are exported: a strict one for the auth endpoints
// (brute-force protection) and a broad per-IP one for the whole API.
import { sendErrorCode } from '../utils/sendError.js';

const prune = (store, now) => {
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key);
    }
};

export const createRateLimiter = ({ windowMs = 60_000, max = 100, key = () => 'global' } = {}) => {
    // Each limiter owns its counters: an auth budget never consumes the
    // general API budget, and tests stay independent of each other.
    const store = new Map();

    // Express contract: call next() when the request is allowed; when the
    // budget is exhausted the response is sent here and nothing else happens.
    const limiter = (req, res, next) => {
        const now = Date.now();
        if (store.size > 5000) prune(store, now);

        const bucket = key(req);
        const entry = store.get(bucket);

        if (!entry || entry.resetAt <= now) {
            store.set(bucket, { count: 1, resetAt: now + windowMs });
            if (next) next();
            return false;
        }

        entry.count += 1;
        if (entry.count > max) {
            const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            sendErrorCode(res, 'RATE_LIMITED', { retryAfter });
            return true;
        }
        if (next) next();
        return false;
    };

    limiter.reset = (bucket) => store.delete(bucket);
    limiter.resetAll = () => store.clear();
    limiter.keyFor = (req) => key(req);
    return limiter;
};

const ipOf = (req) => req.ip ?? req.headers?.['x-forwarded-for'] ?? 'unknown';

const num = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Brute force: attempts are counted per client address AND submitted email, so
// one account cannot be hammered and one attacker cannot lock everyone out.
export const authRateLimiter = createRateLimiter({
    windowMs: num(process.env.AUTH_RATE_WINDOW_MS, 15 * 60_000),
    max: num(process.env.AUTH_RATE_MAX, 10),
    key: (req) => `${ipOf(req)}|${String(req.body?.email ?? '').toLowerCase()}`,
});

// Broad guard against request floods from a single address.
export const apiRateLimiter = createRateLimiter({
    windowMs: num(process.env.API_RATE_WINDOW_MS, 60_000),
    max: num(process.env.API_RATE_MAX, 600),
    key: (req) => ipOf(req),
});
