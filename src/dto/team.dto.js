import { z } from 'zod';

export const createTeamDto = z.object({
    name: z.string().trim().min(1).max(120),
});
