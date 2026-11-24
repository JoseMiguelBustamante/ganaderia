import {
    getMeService,
    loginService,
    registerService,
} from '../services/authService.js';
import { sendError } from '../utils/sendError.js';
import { logger } from '../config/logger.js';

export const registerController = async (req, res) => {
    try {
        const { tenantName, slug, email, password, displayName } = req.validated.body;
        const session = await registerService(tenantName, slug, email, password, displayName);
        return res.status(201).json({ data: session });
    } catch (error) {
        return sendError(res, error);
    }
};

export const loginController = async (req, res) => {
    try {
        const { email, password } = req.validated.body;
        const session = await loginService(email, password);
        return res.status(200).json({ data: session });
    } catch (error) {
        logger.error(`[authController - loginController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
export const getMeController = async (req, res) => {
    try {
        const user = await getMeService(req.user.tenantId, req.user.sub);
        return res.status(200).json({ data: user });
    } catch (error) {
        logger.error(`[authController - getMeController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
