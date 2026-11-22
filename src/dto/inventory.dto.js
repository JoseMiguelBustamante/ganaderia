import { z } from 'zod';

export const createInventoryItemDto = z.object({
    name: z.string().trim().min(1).max(120),
    category: z.enum(['vaccine', 'semen', 'supply']),
    unit: z.string().trim().min(1).max(20).default('unit'),
    minStock: z.number().min(0).optional(),
});

export const addStockDto = z.object({ qty: z.number().positive() });
export const itemIdParamsDto = z.object({ id: z.string().uuid() });
