import { describe, expect, it } from 'vitest';
import type {
  OrderRepositoryPort,
  AuditRepositoryPort,
  MessagePublisherPort,
} from '../../src/application/ports';
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
  const money = Money.create(100, 'USD');
  return Order.create({ id, customerId: 'C1', money, clock });
}

describe('InMemoryOrderRepository', () => {
  it('satisfies OrderRepositoryPort', () => {
    const repo: OrderRepositoryPort = new InMemoryOrderRepository();
    expect(repo).toBeDefined();
  });

  it('save + findById round-trip works', async () => {
    const repo = new InMemoryOrderRepository();
    const order = makeOrder();
    await repo.save(order);
    const found = await repo.findById(order.id);
    expect(found?.id).toBe(order.id);
  });

  it('findById returns null for unknown id', async () => {
    const repo = new InMemoryOrderRepository();
    expect(await repo.findById('unknown')).toBeNull();
  });
});

describe('InMemoryAuditRepository', () => {
  it('satisfies AuditRepositoryPort', () => {
    const repo: AuditRepositoryPort = new InMemoryAuditRepository();
    expect(repo).toBeDefined();
  });

  it('append stores entry', async () => {
    const repo = new InMemoryAuditRepository();
    const entry = {
      orderId: 'order-1',
      event: 'ORDER_CREATED',
      previousState: null,
      newState: 'PENDING',
      timestamp: new Date(),
    };
    await repo.append(entry);
    expect(repo.entries).toHaveLength(1);
    expect(repo.entries[0]).toEqual(entry);
  });
});

describe('InMemoryMessagePublisher', () => {
  it('satisfies MessagePublisherPort', () => {
    const pub: MessagePublisherPort = new InMemoryMessagePublisher();
    expect(pub).toBeDefined();
  });

  it('records published orderIds', async () => {
    const pub = new InMemoryMessagePublisher();
    await pub.publishProcessOrder('order-1');
    await pub.publishProcessOrder('order-2');
    expect(pub.published).toEqual(['order-1', 'order-2']);
  });

  it('drain() returns all published orderIds and clears the queue', async () => {
    const pub = new InMemoryMessagePublisher();
    await pub.publishProcessOrder('order-1');
    await pub.publishProcessOrder('order-2');
    const drained = pub.drain();
    expect(drained).toEqual(['order-1', 'order-2']);
    expect(pub.published).toEqual([]);
  });

  it('second call to drain() returns empty array', async () => {
    const pub = new InMemoryMessagePublisher();
    await pub.publishProcessOrder('order-1');
    pub.drain();
    expect(pub.drain()).toEqual([]);
  });
});
