import { z } from 'zod';

export const CreateOrderSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

export const OrderResponseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrderResponseDto = z.infer<typeof OrderResponseSchema>;
