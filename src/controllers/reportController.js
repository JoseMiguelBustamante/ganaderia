import { getAnimalCostsService, getStageCostsService, getReportsSummaryService } from '../services/reportService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const getAnimalCostsController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        return res.status(200).json({ data: await getAnimalCostsService(req.user.tenantId, id) });
    } catch (error) {
        logger.error(`[reportController - getAnimalCostsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getStageCostsController = async (req, res) => {
    try {
        return res.status(200).json({ data: await getStageCostsService(req.user.tenantId) });
    } catch (error) {
        logger.error(`[reportController - getStageCostsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getReportsSummaryController = async (req, res) => {
    try {
        const { from, to } = req.validated.query;
        return res.status(200).json({ data: await getReportsSummaryService(req.user.tenantId, from, to) });
    } catch (error) {
        logger.error(`[reportController - getReportsSummaryController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
