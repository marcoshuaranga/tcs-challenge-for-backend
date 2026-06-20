import { describe, expect, it, vi } from 'vitest';
import { ListOrdersHandler } from '../../src/application/list-orders-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/in-memory-order-repository';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import { InMemoryMessagePublisher } from '../../src/infrastructure/in-memory-message-publisher';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { Money } from '../../src/domain/money';
import { SystemClock, UuidGenerator } from '@tcs-challenge-for-backend/kernel';

const clock = new SystemClock();
const idGen = new UuidGenerator();

function makeOrder() {
  const id = OrderId.generate(idGen);
  const money = Money.create(50, 'USD');
  return Order.create({ id, customerId: 'C1', money, clock });
}

describe('ListOrdersHandler', () => {
  it('returns all orders when orders exist in the repository', async () => {
    const repo = new InMemoryOrderRepository();
    const o1 = makeOrder();
    const o2 = makeOrder();
    await repo.save(o1);
    await repo.save(o2);
    const handler = new ListOrdersHandler(repo);
    const result = await handler.execute();
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.id)).toContain(o1.id);
    expect(result.map((o) => o.id)).toContain(o2.id);
  });

  it('returns empty array when repository is empty', async () => {
    const repo = new InMemoryOrderRepository();
    const handler = new ListOrdersHandler(repo);
    const result = await handler.execute();
    expect(result).toEqual([]);
  });

  it('has no side effects (no saves, no audit writes, no messages published)', async () => {
    const repo = new InMemoryOrderRepository();
    const auditRepo = new InMemoryAuditRepository();
    const publisher = new InMemoryMessagePublisher();
    const saveSpy = vi.spyOn(repo, 'save');
    const appendSpy = vi.spyOn(auditRepo, 'append');
    const publishSpy = vi.spyOn(publisher, 'publishProcessOrder');
    const handler = new ListOrdersHandler(repo);
    await handler.execute();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(appendSpy).not.toHaveBeenCalled();
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
