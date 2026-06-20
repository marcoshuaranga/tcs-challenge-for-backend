import { describe, expect, it } from 'vitest';
import { OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
import { composeOrders } from '../src/index';
import { OrderAppService } from '../src/application/order-app-service';

describe('composeOrders', () => {
  it('returns an OrderAppService when no flags are set', () => {
    const svc = composeOrders({});
    expect(svc).toBeInstanceOf(OrderAppService);
  });

  it('registerOrder returns ok(orderId) end-to-end', async () => {
    const svc = composeOrders({});
    const result = await svc.registerOrder({ customerId: 'C1', amount: 100, currency: 'USD' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value).toBe('string');
    }
  });

  it('processOrder returns err(OrderNotFoundError) for unknown id', async () => {
    const svc = composeOrders({});
    const result = await svc.processOrder('nonexistent');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(OrderNotFoundError);
    }
  });

  it('throws if USE_AWS_DYNAMO is set to "true"', () => {
    expect(() => composeOrders({ USE_AWS_DYNAMO: 'true' })).toThrow('not implemented');
  });

  it('does not throw if USE_AWS_DYNAMO is "false" (the .env.example default)', () => {
    expect(() => composeOrders({ USE_AWS_DYNAMO: 'false' })).not.toThrow();
  });

  it('throws if USE_AWS_SQS is set to "true"', () => {
    expect(() => composeOrders({ USE_AWS_SQS: 'true' })).toThrow('not implemented');
  });

  it('getOrder returns err(OrderNotFoundError) for unknown id', async () => {
    const svc = composeOrders({});
    const result = await svc.getOrder('nonexistent');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(OrderNotFoundError);
    }
  });

  it('getOrderAudit returns err(OrderNotFoundError) for unknown id', async () => {
    const svc = composeOrders({});
    const result = await svc.getOrderAudit('nonexistent');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(OrderNotFoundError);
    }
  });
});
