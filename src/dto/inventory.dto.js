import { z } from 'zod';

const stageDto = z.enum(['chequeo', 'inseminacion', 'gestacion', 'preparto', 'parto', 'destete', 'engorde']);

export const createInventoryItemDto = z.object({
    name: z.string().trim().min(1).max(120),
    category: z.enum(['vaccine', 'semen', 'supply']),
    unit: z.string().trim().min(1).max(20).default('unit'),
    minStock: z.number().min(0).optional(),
    stage: stageDto.optional(),
});

export const listInventoryQueryDto = z.object({
    stage: stageDto.optional(),
});

export const addStockDto = z.object({ qty: z.number().positive() });
export const itemIdParamsDto = z.object({ id: z.string().uuid() });

export const updateInventoryItemDto = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    unit: z.string().trim().min(1).max(20).optional(),
    minStock: z.number().min(0).optional(),
    stage: stageDto.nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    error: 'At least one field is required',
});
