import { z } from 'zod';

const nameDto = z.string().trim().min(1).max(160);
const contactNameDto = z.string().trim().min(1).max(160);
const phoneDto = z.string().trim().min(5).max(30);
const emailDto = z.string().trim().email().max(200);

export const supplierIdParamsDto = z.object({ id: z.string().uuid() });

export const createSupplierDto = z.object({
    name: nameDto,
    contactName: contactNameDto.optional(),
    phone: phoneDto.optional(),
    email: emailDto.optional(),
});

export const updateSupplierDto = z.object({
    contactName: contactNameDto.optional(),
    phone: phoneDto.optional(),
    email: emailDto.optional(),
}).refine((data) => Object.keys(data).length > 0, {
    error: 'At least one field is required',
});

export const listSuppliersQueryDto = z.object({
    activeOnly: z.enum(['true', 'false']).default('true'),
});
