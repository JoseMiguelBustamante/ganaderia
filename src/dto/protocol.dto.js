import { z } from 'zod';

const phaseDto = z.object({
    phaseNumber: z.number().int().min(1).max(7),
    name: z.string().trim().min(1).max(120),
    requiredItemId: z.string().uuid().optional(),
    requiredQty: z.number().positive().optional(),
    defaultTeamId: z.string().uuid().optional(),
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
    semenLotId: z.string().uuid().optional(),
    doses: z.number().int().positive().max(10000).optional(),
}).superRefine((data, ctx) => {
    if ((data.semenLotId === undefined) !== (data.doses === undefined)) {
        ctx.addIssue({
            code: 'custom',
            message: 'semenLotId and doses must be provided together',
            path: [data.semenLotId === undefined ? 'semenLotId' : 'doses'],
        });
    }
});

export const animalIdParamsDto = z.object({ id: z.string().uuid() });
