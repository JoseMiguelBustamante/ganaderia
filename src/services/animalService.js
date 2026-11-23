import { createAnimal, getAllAnimals, getAnimalById } from '../repositories/animalRepository.js';
import { ConflictError, NotFoundError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export const createAnimalService = async (tenantId, dto) => {
    logger.startTimer('createAnimalService');
    try {
        const { earTag, name, sex, breed, birthDate, chipSerial, notes } = dto;
        return await createAnimal(tenantId, earTag, name, sex, breed, birthDate, chipSerial, notes);
    } catch (error) {
        logger.error(`[animalService - createAnimalService] Error: ${error.message}`);
        if (error.code === '23505') {
            throw new ConflictError({ reason: 'EAR_TAG_ALREADY_EXISTS' });
        }
        throw error;
    } finally {
        logger.endTimer('createAnimalService');
    }
};

export const getAllAnimalsService = async (tenantId, search) => {
    logger.startTimer('getAllAnimalsService');
    try {
        const animals = await getAllAnimals(tenantId, search);
        return animals.map(toPublicAnimal);
    } catch (error) {
        logger.error(`[animalService - getAllAnimalsService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllAnimalsService');
    }
};

export const getAnimalByIdService = async (tenantId, id) => {
    logger.startTimer('getAnimalByIdService');
    try {
        const animal = await getAnimalById(tenantId, id);
        if (!animal) throw new NotFoundError();
        return toPublicAnimal(animal);
    } catch (error) {
        logger.error(`[animalService - getAnimalByIdService] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAnimalByIdService');
    }
};

// Public API surface is camelCase end to end (writes already are, via the SP
// json payload). Read rows are re-shaped here, matching authService.toPublicUser.
function toPublicAnimal(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        earTag: row.ear_tag,
        name: row.name,
        sex: row.sex,
        breed: row.breed,
        birthDate: row.birth_date,
        chipSerial: row.chip_serial,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
    };
}
