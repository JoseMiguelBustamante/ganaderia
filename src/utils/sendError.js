import { logger } from '../config/logger.js';
import { AppError } from './AppError.js';
import { errorCodes } from '../config/errorCodes.js';

export const sendErrorCode = (res, codeKey, details = null) => {
    const definition = errorCodes[codeKey] ?? errorCodes.INTERNAL_ERROR;
    const payload = {
        error: {
            code: definition.code,
            message: definition.message,
        },
    };

    if (details) {
        payload.error.details = details;
    }

    return res.status(definition.statusCode).json(payload);
};

export const sendError = (res, error) => {
    if (error instanceof AppError) {
        return sendErrorCode(res, error.code, error.details);
    }

    logger.error(error);
    return sendErrorCode(res, 'INTERNAL_ERROR');
};
