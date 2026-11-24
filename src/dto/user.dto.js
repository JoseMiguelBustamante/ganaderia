import { z } from 'zod';

const passwordDto = z.string().min(8).max(72);
export const createUserDto = z.object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: passwordDto,
    displayName: z.string().trim().min(1).max(120),
    role: z.enum(['owner', 'manager', 'operator', 'vet']),
    teamId: z.string().uuid().optional(),
});
export const userIdParamsDto = z.object({ id: z.string().uuid() });
export const changeUserPasswordDto = z.object({ password: passwordDto });
