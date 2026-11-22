import { errorCodes } from '../config/errorCodes.js';

export class AppError extends Error {
    constructor(codeKey, details = null) {
        const definition = errorCodes[codeKey] ?? errorCodes.INTERNAL_ERROR;
        super(definition.message);
        this.name = 'AppError';
        this.code = definition.code;
        this.statusCode = definition.statusCode;
        this.details = details;
    }
}

export class ValidationError extends AppError {
    constructor(details = null) {
        super('VALIDATION_ERROR', details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(details = null) {
        super('UNAUTHORIZED', details);
    }
}

export class ForbiddenError extends AppError {
    constructor(details = null) {
        super('FORBIDDEN', details);
    }
}

export class NotFoundError extends AppError {
    constructor(details = null) {
        super('NOT_FOUND', details);
    }
}

export class ConflictError extends AppError {
    constructor(details = null) {
        super('CONFLICT', details);
    }
}

export class BusinessError extends AppError {
    constructor(details = null) {
        super('BUSINESS_RULE', details);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(details = null) {
        super('SERVICE_UNAVAILABLE', details);
    }
}
