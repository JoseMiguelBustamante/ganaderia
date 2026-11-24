// Browser origins allowed to call the API cross-origin. Mirrors the
// Electronica_Central_backend policy: only the SPA's own origin receives
// CORS headers; everything else is forwarded unmodified (and the browser
// decides whether to honor the response).
import { env } from '../config/env.js';

const ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';

export const corsMiddleware = (req, res, next) => {
    if (env.FRONTEND_ORIGIN && req.headers.origin === env.FRONTEND_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', env.FRONTEND_ORIGIN);
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
        res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
};
