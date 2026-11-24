import {
    createSemenLotService,
    getAllSemenLotsService,
    getSemenLotByIdService,
    consumeSemenLotService,
} from '../services/semenLotService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createSemenLotController = async (req, res) => {
    try {
        const lot = await createSemenLotService(req.user.tenantId, req.validated.body);
        return res.status(201).json({ data: lot });
    } catch (error) {
        logger.error(`[semenLotController - createSemenLotController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllSemenLotsController = async (req, res) => {
    try {
        const lots = await getAllSemenLotsService(req.user.tenantId);
        return res.status(200).json({ data: lots });
    } catch (error) {
        logger.error(`[semenLotController - getAllSemenLotsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getSemenLotByIdController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const lot = await getSemenLotByIdService(req.user.tenantId, id);
        return res.status(200).json({ data: lot });
    } catch (error) {
        logger.error(`[semenLotController - getSemenLotByIdController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const consumeSemenLotController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const lot = await consumeSemenLotService(req.user.tenantId, id, req.validated.body);
        return res.status(200).json({ data: lot });
    } catch (error) {
        logger.error(`[semenLotController - consumeSemenLotController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
