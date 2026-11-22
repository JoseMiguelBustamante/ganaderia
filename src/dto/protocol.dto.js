import { z } from 'zod';

const phaseDto = z.object({
    phaseNumber: z.number().int().min(1).max(7),
    name: z.string().trim().min(1).max(120),
    requiredItemId: z.string().uuid().optional(),
    requiredQty: z.number().positive().optional(),
}).superRefine((phase, ctx) => {
    if ((phase.requiredItemId === undefined) !== (phase.requiredQty === undefined)) {
        ctx.addIssue({
            code: 'custom',
            message: 'requiredItemId and requiredQty must be provided together',
            path: [phase.requiredItemId === undefined ? 'requiredItemId' : 'requiredQty'],
        });
    }
});

export const createProtocolDto = z.object({
    name: z.string().trim().min(1).max(120),
    phases: z.array(phaseDto).min(1).max(7),
});

export const executePhaseDto = z.object({
    protocolId: z.string().uuid(),
    phaseNumber: z.number().int().min(1).max(7),
    teamId: z.string().uuid().optional(),
    notes: z.string().trim().max(500).optional(),
});

export const animalIdParamsDto = z.object({ id: z.string().uuid() });
