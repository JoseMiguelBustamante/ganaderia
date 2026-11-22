import {
    createAnimalService,
    getAllAnimalsService,
    getAnimalByIdService,
} from '../services/animalService.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/sendError.js';

export const createAnimalController = async (req, res) => {
    try {
        const animal = await createAnimalService(req.user.tenantId, req.validated.body);
        return res.status(201).json({ data: animal });
    } catch (error) {
        logger.error(`[animalController - createAnimalController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAllAnimalsController = async (req, res) => {
    try {
        const { search } = req.validated.query;
        const animals = await getAllAnimalsService(req.user.tenantId, search);
        return res.status(200).json({ data: animals });
    } catch (error) {
        logger.error(`[animalController - getAllAnimalsController] Error: ${error.message}`);
        return sendError(res, error);
    }
};

export const getAnimalByIdController = async (req, res) => {
    try {
        const { id } = req.validated.params;
        const animal = await getAnimalByIdService(req.user.tenantId, id);
        return res.status(200).json({ data: animal });
    } catch (error) {
        logger.error(`[animalController - getAnimalByIdController] Error: ${error.message}`);
        return sendError(res, error);
    }
};
