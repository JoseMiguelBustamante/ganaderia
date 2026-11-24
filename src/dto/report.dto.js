import { z } from 'zod';

export const reportAnimalIdParamsDto = z.object({ id: z.string().uuid() });
export const reportsSummaryQueryDto = z.object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
}).refine(({ from, to }) => !from || from <= (to ?? new Date().toISOString().slice(0, 10)), {
    message: 'from must not be after to', path: ['from'],
});
