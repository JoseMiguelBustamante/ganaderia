import {
    createProtocolService, createBreedingProtocolService, executePhaseService,
    getPhaseExecutionsService, getAllProtocolsService,
} from '../services/protocolService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createProtocolController = async (req, res) => {
    try {
        const { name, phases } = req.validated.body;
        const protocol = await createProtocolService(req.user.tenantId, name, phases);
        return res.status(201).json({ data: protocol });
    } catch (error) {
        logger.error(`[protocolController - createProtocolController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const createBreedingProtocolController = async (req, res) => {
    try {
        const protocol = await createBreedingProtocolService(req.user.tenantId);
        return res.status(protocol.existed ? 200 : 201).json({ data: protocol });
    } catch (error) {
        logger.error(`[protocolController - createBreedingProtocolController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllProtocolsController = async (req, res) => {
    try {
        const protocols = await getAllProtocolsService(req.user.tenantId);
        return res.status(200).json({ data: protocols });
    } catch (error) {
        logger.error(`[protocolController - getAllProtocolsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const executePhaseController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const { protocolId, phaseNumber, teamId, notes } = req.validated.body;
        const execution = await executePhaseService(
            req.user.tenantId, id, protocolId, phaseNumber, teamId, req.user.sub, notes,
        );
        return res.status(200).json({ data: execution });
    } catch (error) {
        logger.error(`[protocolController - executePhaseController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getPhaseExecutionsController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const executions = await getPhaseExecutionsService(req.user.tenantId, id);
        return res.status(200).json({ data: executions });
    } catch (error) {
        logger.error(`[protocolController - getPhaseExecutionsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
