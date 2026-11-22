import { withTenant } from '../db/postgres.js';
import { constants } from '../config/constants.js';
import { logger } from '../config/logger.js';

export const createAnimal = async (tenantId, earTag, name, sex, breed, birthDate, chipSerial, notes) => {
    logger.startTimer('createAnimal_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `CALL ${constants.SP_CREATE_ANIMAL}($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [tenantId, earTag, name, sex, breed, birthDate, chipSerial, notes, null],
        ));
        return result.rows[0].p_animal ?? result.rows[0];
    } catch (error) {
        logger.error(`[animalRepository - createAnimal] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('createAnimal_repository');
    }
};

export const getAllAnimals = async (tenantId, search) => {
    logger.startTimer('getAllAnimals_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_ALL_ANIMALS}($1,$2)`,
            [tenantId, search ?? null],
        ));
        return result.rows;
    } catch (error) {
        logger.error(`[animalRepository - getAllAnimals] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAllAnimals_repository');
    }
};

export const getAnimalById = async (tenantId, animalId) => {
    logger.startTimer('getAnimalById_repository');
    try {
        const result = await withTenant(tenantId, (client) => client.query(
            `SELECT * FROM ${constants.FN_GET_ANIMAL_BY_ID}($1,$2)`,
            [tenantId, animalId],
        ));
        return result.rows[0] ?? null;
    } catch (error) {
        logger.error(`[animalRepository - getAnimalById] Error: ${error.message}`);
        throw error;
    } finally {
        logger.endTimer('getAnimalById_repository');
    }
};
