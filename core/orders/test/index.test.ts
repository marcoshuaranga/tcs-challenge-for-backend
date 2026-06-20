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

  it('wires DynamoOrderRepository when USE_AWS_DYNAMO=true', () => {
    expect(() =>
      composeOrders({ USE_AWS_DYNAMO: 'true', ORDERS_TABLE: 't', AWS_REGION: 'us-east-1' }),
    ).not.toThrow();
  });

  it('does not throw if USE_AWS_DYNAMO is "false" (the .env.example default)', () => {
    expect(() => composeOrders({ USE_AWS_DYNAMO: 'false' })).not.toThrow();
  });

  it('wires SqsMessagePublisher when USE_AWS_SQS=true', () => {
    expect(() =>
      composeOrders({ USE_AWS_SQS: 'true', QUEUE_URL: 'https://sqs/q', AWS_REGION: 'us-east-1' }),
    ).not.toThrow();
  });

  it('composeOrders({}) still wires in-memory adapters (no regression)', () => {
    const svc = composeOrders({});
    expect(svc).toBeInstanceOf(OrderAppService);
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

  it('listOrders returns ok([]) on an empty store', async () => {
    const svc = composeOrders({});
    const result = await svc.listOrders();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });
});
