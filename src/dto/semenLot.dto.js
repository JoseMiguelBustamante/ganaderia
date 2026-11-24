import { z } from 'zod';

export const semenLotIdParamsDto = z.object({ id: z.string().uuid() });

export const createSemenLotDto = z.object({
    itemId: z.string().uuid(),
    supplierId: z.string().uuid().nullable().optional(),
    lotCode: z.string().trim().min(1).max(80),
    totalDoses: z.number().int().positive().max(10000),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expiresAt must be YYYY-MM-DD').optional(),
});

export const consumeSemenLotDto = z.object({
    doses: z.number().int().positive().max(10000),
    animalId: z.string().uuid().nullable().optional(),
});
