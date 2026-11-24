import { z } from 'zod';

const moneyDto = z.number().min(-9999999999.99).max(9999999999.99).multipleOf(0.01);
export const purchaseIdParamsDto = z.object({ id: z.string().uuid() });
export const createPurchaseDto = z.object({
    description: z.string().trim().min(1).max(2000),
    totalAmount: moneyDto.positive(),
    supplierId: z.string().uuid().optional(),
    purchasedAt: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    itemId: z.string().uuid().optional(),
    quantity: z.number().positive().max(999999999.999).multipleOf(0.001).optional(),
}).superRefine((purchase, ctx) => {
    if ((purchase.itemId === undefined) !== (purchase.quantity === undefined)) {
        ctx.addIssue({ code: 'custom', message: 'itemId and quantity must be provided together',
            path: [purchase.itemId === undefined ? 'itemId' : 'quantity'] });
    }
});
export const listPurchasesQueryDto = z.object({ status: z.enum(['pending', 'partial', 'paid']).optional() });
// Non-positive values reach the procedure's stable business-rule error (422).
export const registerPurchasePaymentDto = z.object({ amount: moneyDto });
