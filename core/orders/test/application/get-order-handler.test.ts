import { describe, expect, it } from 'vitest';
import { OrderNotFoundError, UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { GetOrderHandler } from '../../src/application/get-order-handler';
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
  return { handler: new GetOrderHandler(orderRepo), orderRepo, auditRepo };
}

describe('GetOrderHandler', () => {
  it('returns the Order for a known orderId', async () => {
    const { handler, orderRepo } = makeHandler();
    const order = makeOrder();
    await orderRepo.save(order);
    const found = await handler.execute({ orderId: order.id });
    expect(found.id).toBe(order.id);
  });

  it('throws OrderNotFoundError for an unknown orderId', async () => {
    const { handler } = makeHandler();
    await expect(handler.execute({ orderId: 'nonexistent' })).rejects.toThrow(OrderNotFoundError);
  });

  it('has no side effects (no saves, no audit writes)', async () => {
    const { handler, orderRepo, auditRepo } = makeHandler();
    const order = makeOrder();
    await orderRepo.save(order);
    await handler.execute({ orderId: order.id });
    expect(await orderRepo.listAll()).toHaveLength(1);
    expect(auditRepo.entries).toHaveLength(0);
  });
});
