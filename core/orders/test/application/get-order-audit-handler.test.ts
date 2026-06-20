import { describe, expect, it } from 'vitest';
import { OrderNotFoundError, UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { GetOrderAuditHandler } from '../../src/application/get-order-audit-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/in-memory-order-repository';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { Money } from '../../src/domain/money';

const clock = new SystemClock();
const idGen = new UuidGenerator();

function makeOrder() {
  const id = OrderId.generate(idGen);
  const money = Money.create(100, 'USD');
  return Order.create({ id, customerId: 'C1', money, clock });
}

function makeHandler() {
  const orderRepo = new InMemoryOrderRepository();
  const auditRepo = new InMemoryAuditRepository();
  return { handler: new GetOrderAuditHandler(orderRepo, auditRepo), orderRepo, auditRepo };
}

describe('GetOrderAuditHandler', () => {
  it('returns audit entries in insertion order for a known order', async () => {
    const { handler, orderRepo, auditRepo } = makeHandler();
    const order = makeOrder();
    await orderRepo.save(order);
    const e1 = {
      orderId: order.id,
      event: 'ORDER_CREATED',
      previousState: null,
      newState: 'PENDING',
      timestamp: new Date(),
    };
    const e2 = {
      orderId: order.id,
      event: 'ORDER_PROCESSING',
      previousState: 'PENDING',
      newState: 'PROCESSING',
      timestamp: new Date(),
    };
    await auditRepo.append(e1);
    await auditRepo.append(e2);
    const entries = await handler.execute({ orderId: order.id });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(e1);
    expect(entries[1]).toEqual(e2);
  });

  it('returns empty array for an order with no audit entries', async () => {
    const { handler, orderRepo } = makeHandler();
    const order = makeOrder();
    await orderRepo.save(order);
    const entries = await handler.execute({ orderId: order.id });
    expect(entries).toEqual([]);
  });

  it('throws OrderNotFoundError for a non-existent order', async () => {
    const { handler } = makeHandler();
    await expect(handler.execute({ orderId: 'nonexistent' })).rejects.toThrow(OrderNotFoundError);
  });
});
