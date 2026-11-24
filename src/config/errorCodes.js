export const errorCodes = {
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: 'The request is invalid',
    },
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Authentication required',
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'You do not have permission',
    },
    NOT_FOUND: {
        code: 'NOT_FOUND',
        statusCode: 404,
        message: 'Resource not found',
    },
    CONFLICT: {
        code: 'CONFLICT',
        statusCode: 409,
        message: 'The resource conflicts with the current state',
    },
    BUSINESS_RULE: {
        code: 'BUSINESS_RULE',
        statusCode: 422,
        message: 'The request could not be processed',
    },
    INTERNAL_ERROR: {
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        message: 'Internal server error',
    },
    RATE_LIMITED: {
        code: 'RATE_LIMITED',
        statusCode: 429,
        message: 'Too many requests',
    },
    SERVICE_UNAVAILABLE: {
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: 'Service unavailable',
    },
};
