import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const CreateOrderSchema = z
  .object({
    customerId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .openapi('CreateOrder', {
    example: { customerId: 'cust-123', amount: 99.99, currency: 'USD' },
  });

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

export const OrderResponseSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    customerId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('OrderResponse');

export type OrderResponseDto = z.infer<typeof OrderResponseSchema>;

export const ErrorEnvelopeSchema = z
  .object({
    error: z.string(),
    message: z.string(),
  })
  .openapi('ErrorEnvelope');
