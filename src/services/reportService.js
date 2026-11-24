import { getAnimalCosts, getStageCosts, getReportsSummary } from '../repositories/reportRepository.js';
import { NotFoundError } from '../utils/AppError.js';

export const getAnimalCostsService = async (tenantId, animalId) => {
    const costs = await getAnimalCosts(tenantId, animalId);
    if (!costs) throw new NotFoundError();
    return costs;
};
export const getStageCostsService = async (tenantId) => getStageCosts(tenantId);
export const getReportsSummaryService = async (tenantId, from, to) => getReportsSummary(tenantId, from, to);
