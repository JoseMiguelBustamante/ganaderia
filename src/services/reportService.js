import {
    getAnimalCosts, getStageCosts, getReportsSummary,
    getPurchasesForExport, getMovementsForExport,
} from '../repositories/reportRepository.js';
import { NotFoundError } from '../utils/AppError.js';

export const getAnimalCostsService = async (tenantId, animalId) => {
    const costs = await getAnimalCosts(tenantId, animalId);
    if (!costs) throw new NotFoundError();
    return costs;
};
export const getStageCostsService = async (tenantId) => getStageCosts(tenantId);
export const getReportsSummaryService = async (tenantId, from, to) => getReportsSummary(tenantId, from, to);

// CSV exports (operar con confianza, T2). Pure builders keep the format testable.
export const toCsv = (headers, rows) => {
    const escape = (value) => {
        const text = value === null || value === undefined ? '' : String(value);
        return `"${text.replace(/"/g, '""')}"`;
    };
    return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
};

const day = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

export const exportPurchasesCsvService = async (tenantId, from, to) => {
    const rows = await getPurchasesForExport(tenantId, from, to);
    return toCsv(
        ['fecha', 'descripcion', 'proveedor', 'total', 'pagado', 'estado', 'vencimiento'],
        rows.map((r) => [
            day(r.purchased_at), r.description, r.supplier, r.total_amount,
            r.paid_amount, r.status, day(r.due_date),
        ]),
    );
};

export const exportConsumptionCsvService = async (tenantId, from, to) => {
    const rows = await getMovementsForExport(tenantId, from, to);
    return toCsv(
        ['fecha', 'insumo', 'categoria', 'cantidad', 'motivo', 'caravana'],
        rows.map((r) => [
            r.occurred_at ? new Date(r.occurred_at).toISOString().slice(0, 10) : '',
            r.item, r.category, r.delta_qty, r.reason, r.animal_tag,
        ]),
    );
};
