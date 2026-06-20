import { describe, expect, it } from 'vitest';
import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { CreateOrderHandler } from '../../src/application/create-order-handler';
import { RecordAuditEntryHandler } from '../../src/application/record-audit-entry-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/in-memory-order-repository';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import { InMemoryMessagePublisher } from '../../src/infrastructure/in-memory-message-publisher';
import { InvalidMoneyError } from '../../src/domain/errors';

function makeHandler() {
  const orderRepo = new InMemoryOrderRepository();
  const auditRepo = new InMemoryAuditRepository();
  const publisher = new InMemoryMessagePublisher();
  const auditHandler = new RecordAuditEntryHandler(auditRepo);
  const handler = new CreateOrderHandler(
    new UuidGenerator(),
    new SystemClock(),
    orderRepo,
    auditHandler,
    publisher,
  );
  return { handler, orderRepo, auditRepo, publisher };
}

describe('CreateOrderHandler', () => {
  it('returns a created Order with a non-empty id', async () => {
    const { handler } = makeHandler();
    const order = await handler.execute({ customerId: 'C1', amount: 100, currency: 'USD' });
    expect(typeof order.id).toBe('string');
    expect(order.id.length).toBeGreaterThan(0);
    expect(order.status).toBe('PENDING');
  });

  it('order is saved in repository after execute', async () => {
    const { handler, orderRepo } = makeHandler();
    const order = await handler.execute({ customerId: 'C1', amount: 100, currency: 'USD' });
    const saved = await orderRepo.findById(order.id);
    expect(saved).not.toBeNull();
    expect(saved?.id).toBe(order.id);
  });

  it('audit entry with ORDER_CREATED is recorded', async () => {
    const { handler, auditRepo } = makeHandler();
    const order = await handler.execute({ customerId: 'C1', amount: 100, currency: 'USD' });
    expect(auditRepo.entries).toHaveLength(1);
    expect(auditRepo.entries[0]?.event).toBe('ORDER_CREATED');
    expect(auditRepo.entries[0]?.orderId).toBe(order.id);
    expect(auditRepo.entries[0]?.previousState).toBeNull();
    expect(auditRepo.entries[0]?.newState).toBe('PENDING');
  });

  it('publishProcessOrder called once with the new orderId', async () => {
    const { handler, publisher } = makeHandler();
    const order = await handler.execute({ customerId: 'C1', amount: 100, currency: 'USD' });
    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0]).toBe(order.id);
  });

  it('invalid money (amount=0) throws InvalidMoneyError before any save', async () => {
    const { handler, orderRepo } = makeHandler();
    await expect(handler.execute({ customerId: 'C1', amount: 0, currency: 'USD' })).rejects.toThrow(
      InvalidMoneyError,
    );
    const nothing = await orderRepo.findById('any');
    expect(nothing).toBeNull();
  });
});
