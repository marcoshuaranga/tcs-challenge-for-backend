import { describe, expect, it } from 'vitest';
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

  it('throws if USE_AWS_DYNAMO is set', () => {
    expect(() => composeOrders({ USE_AWS_DYNAMO: 'true' })).toThrow('not implemented');
  });

  it('throws if USE_AWS_SQS is set', () => {
    expect(() => composeOrders({ USE_AWS_SQS: 'true' })).toThrow('not implemented');
  });
});
