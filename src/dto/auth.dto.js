import { z } from 'zod';

const emailDto = z.string().trim().toLowerCase().email().max(255);
const passwordDto = z.string().min(8).max(72);
const displayNameDto = z.string().trim().min(1).max(120);
const slugDto = z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case');
const tenantNameDto = z.string().trim().min(1).max(120);

export const registerDto = z.object({
    tenantName: tenantNameDto,
    slug: slugDto,
    email: emailDto,
    password: passwordDto,
    displayName: displayNameDto,
});

export const loginDto = z.object({
    email: emailDto,
    password: z.string().min(1).max(72),
});
