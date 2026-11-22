import { z } from 'zod';

export const createAnimalDto = z.object({
    earTag: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(120).optional(),
    sex: z.enum(['female', 'male']),
    breed: z.string().trim().min(1).max(80).optional(),
    birthDate: z.string().date().refine(
        (date) => date <= new Date().toISOString().slice(0, 10),
        { message: 'Birth date cannot be in the future' },
    ).optional(),
    chipSerial: z.string().trim().min(1).max(64).optional(),
    notes: z.string().max(2000).optional(),
});

export const listAnimalsQueryDto = z.object({
    search: z.string().min(1).max(64).optional(),
});

export const animalIdParamsDto = z.object({
    id: z.string().uuid(),
});
