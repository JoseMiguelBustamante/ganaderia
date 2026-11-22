import { sendErrorCode } from '../utils/sendError.js';

const validationError = (res, details) =>
    sendErrorCode(res, 'VALIDATION_ERROR', details);

export const validateBody = (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return validationError(res, parsed.error.format());
    }
    req.validated = { ...req.validated, body: parsed.data };
    return next();
};

export const validateQuery = (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.query || {});
    if (!parsed.success) {
        return validationError(res, parsed.error.format());
    }
    req.validated = { ...req.validated, query: parsed.data };
    return next();
};

export const validateParams = (schema) => (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
        return validationError(res, parsed.error.format());
    }
    req.validated = { ...req.validated, params: parsed.data };
    return next();
};
