import { describe, expect, it } from 'vitest';
import { UuidGenerator, SystemClock, OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
import { ProcessOrderHandler } from '../../src/application/process-order-handler';
import { RecordAuditEntryHandler } from '../../src/application/record-audit-entry-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/in-memory-order-repository';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import { FakePaymentGateway } from '../../src/infrastructure/fake-payment-gateway';
import { Order } from '../../src/domain/order';
import { OrderId } from '../../src/domain/order-id';
import { Money } from '../../src/domain/money';

const clock = new SystemClock();
const idGen = new UuidGenerator();

function makeOrder(amount: number) {
  const id = OrderId.generate(idGen);
  const money = Money.create(amount, 'USD');
  return Order.create({ id, customerId: 'C1', money, clock });
}

function makeHandler(failAboveAmount: number) {
  const orderRepo = new InMemoryOrderRepository();
  const auditRepo = new InMemoryAuditRepository();
  const auditHandler = new RecordAuditEntryHandler(auditRepo);
  const gateway = new FakePaymentGateway(failAboveAmount);
  const handler = new ProcessOrderHandler(clock, orderRepo, auditHandler, gateway);
  return { handler, orderRepo, auditRepo };
}

describe('ProcessOrderHandler', () => {
  it('happy path: gateway approves → COMPLETED, 2 audit entries, saved twice', async () => {
    const { handler, orderRepo, auditRepo } = makeHandler(Infinity);
    const order = makeOrder(50);
    await orderRepo.save(order);

    await handler.execute(order.id);

    const saved = await orderRepo.findById(order.id);
    expect(saved?.status).toBe('COMPLETED');
    expect(auditRepo.entries).toHaveLength(2);
    expect(auditRepo.entries[0]?.event).toBe('ORDER_PROCESSING_STARTED');
    expect(auditRepo.entries[1]?.event).toBe('ORDER_COMPLETED');
  });

  it('declined path: gateway declines → FAILED with payment_declined, 2 audit entries', async () => {
    const { handler, orderRepo, auditRepo } = makeHandler(0);
    const order = makeOrder(50);
    await orderRepo.save(order);

    await handler.execute(order.id);

    const saved = await orderRepo.findById(order.id);
    expect(saved?.status).toBe('FAILED');
    expect(saved?.failureReason).toBe('payment_declined');
    expect(auditRepo.entries).toHaveLength(2);
    expect(auditRepo.entries[0]?.event).toBe('ORDER_PROCESSING_STARTED');
    expect(auditRepo.entries[1]?.event).toBe('ORDER_FAILED');
  });

  it('idempotent: PROCESSING order → no-op (no save, no audit, no gateway call)', async () => {
    const { handler, orderRepo, auditRepo } = makeHandler(Infinity);
    const order = makeOrder(50);
    const processing = order.startProcessing(clock);
    await orderRepo.save(processing);

    await handler.execute(processing.id);

    const saved = await orderRepo.findById(processing.id);
    expect(saved?.status).toBe('PROCESSING');
    expect(auditRepo.entries).toHaveLength(0);
  });

  it('idempotent: COMPLETED order → no-op', async () => {
    const { handler, orderRepo, auditRepo } = makeHandler(Infinity);
    const order = makeOrder(50).startProcessing(clock).complete(clock);
    await orderRepo.save(order);

    await handler.execute(order.id);

    expect(auditRepo.entries).toHaveLength(0);
  });

  it('not found → throws OrderNotFoundError', async () => {
    const { handler } = makeHandler(Infinity);
    await expect(handler.execute('nonexistent')).rejects.toThrow(OrderNotFoundError);
  });
});
