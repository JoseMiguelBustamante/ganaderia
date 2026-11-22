import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendErrorCode } from '../utils/sendError.js';

export const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return sendErrorCode(res, 'UNAUTHORIZED', { reason: 'MISSING_TOKEN' });
    }
    try {
        req.user = jwt.verify(header.slice(7), env.JWT_SECRET);
        return next();
    } catch (err) {
        const reason = err.name === 'TokenExpiredError' ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN';
        return sendErrorCode(res, 'UNAUTHORIZED', { reason });
    }
};

export const authorize = (...roles) => (req, res, next) => {
    if (!req.user) return sendErrorCode(res, 'UNAUTHORIZED', { reason: 'MISSING_TOKEN' });
    if (!roles.includes(req.user.role)) return sendErrorCode(res, 'FORBIDDEN');
    return next();
};
