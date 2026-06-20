import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { CreateOrderSchema, OrderResponseSchema } from '../src/order';

describe('CreateOrderSchema', () => {
  it('valid payload parses successfully', () => {
    const result = CreateOrderSchema.parse({
      customerId: 'C1',
      amount: 100,
      currency: 'USD',
    });
    expect(result).toEqual({ customerId: 'C1', amount: 100, currency: 'USD' });
  });

  it('negative amount is rejected', () => {
    expect(() =>
      CreateOrderSchema.parse({ customerId: 'C1', amount: -1, currency: 'USD' }),
    ).toThrow(ZodError);
  });

  it('zero amount is rejected', () => {
    expect(() => CreateOrderSchema.parse({ customerId: 'C1', amount: 0, currency: 'USD' })).toThrow(
      ZodError,
    );
  });

  it('empty customerId is rejected', () => {
    expect(() => CreateOrderSchema.parse({ customerId: '', amount: 50, currency: 'USD' })).toThrow(
      ZodError,
    );
  });

  it('currency with wrong format is rejected', () => {
    expect(() => CreateOrderSchema.parse({ customerId: 'C1', amount: 50, currency: 'us' })).toThrow(
      ZodError,
    );
  });
});

describe('OrderResponseSchema', () => {
  const validResponse = {
    id: 'order-1',
    status: 'PENDING' as const,
    customerId: 'C1',
    amount: 100,
    currency: 'USD',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('valid order response parses successfully', () => {
    expect(() => OrderResponseSchema.parse(validResponse)).not.toThrow();
  });

  it('invalid status is rejected', () => {
    expect(() => OrderResponseSchema.parse({ ...validResponse, status: 'UNKNOWN' })).toThrow(
      ZodError,
    );
  });

  it('missing createdAt is rejected', () => {
    const withoutCreatedAt = { ...validResponse, createdAt: undefined };
    expect(() => OrderResponseSchema.parse(withoutCreatedAt)).toThrow(ZodError);
  });

  it('datetime without UTC offset is rejected (Zod 4 requires Z suffix)', () => {
    expect(() =>
      OrderResponseSchema.parse({ ...validResponse, createdAt: '2024-01-01T00:00:00' }),
    ).toThrow(ZodError);
  });
});
