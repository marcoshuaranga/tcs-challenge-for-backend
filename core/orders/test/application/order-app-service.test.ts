import { describe, expect, it } from 'vitest';
import { UuidGenerator, SystemClock, OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
import { OrderAppService } from '../../src/application/order-app-service';
import { CreateOrderHandler } from '../../src/application/create-order-handler';
import { ProcessOrderHandler } from '../../src/application/process-order-handler';
import { RecordAuditEntryHandler } from '../../src/application/record-audit-entry-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/in-memory-order-repository';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import { InMemoryMessagePublisher } from '../../src/infrastructure/in-memory-message-publisher';
import { FakePaymentGateway } from '../../src/infrastructure/fake-payment-gateway';
import { InvalidMoneyError } from '../../src/domain/errors';

const clock = new SystemClock();
const idGen = new UuidGenerator();

function makeService() {
  const orderRepo = new InMemoryOrderRepository();
  const auditRepo = new InMemoryAuditRepository();
  const publisher = new InMemoryMessagePublisher();
  const auditHandler = new RecordAuditEntryHandler(auditRepo);
  const createHandler = new CreateOrderHandler(idGen, clock, orderRepo, auditHandler, publisher);
  const processHandler = new ProcessOrderHandler(
    clock,
    orderRepo,
    auditHandler,
    new FakePaymentGateway(Infinity),
  );
  return new OrderAppService(createHandler, processHandler);
}

describe('OrderAppService', () => {
  it('registerOrder returns ok(orderId) on valid input', async () => {
    const svc = makeService();
    const result = await svc.registerOrder({ customerId: 'C1', amount: 50, currency: 'USD' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.value).toBe('string');
      expect(result.value.length).toBeGreaterThan(0);
    }
  });

  it('registerOrder returns err(InvalidMoneyError) on invalid amount', async () => {
    const svc = makeService();
    const result = await svc.registerOrder({ customerId: 'C1', amount: -1, currency: 'USD' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(InvalidMoneyError);
    }
  });

  it('processOrder returns ok(undefined) for a valid PENDING order', async () => {
    const svc = makeService();
    const registered = await svc.registerOrder({ customerId: 'C1', amount: 50, currency: 'USD' });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const result = await svc.processOrder(registered.value);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeUndefined();
    }
  });

  it('processOrder returns err(OrderNotFoundError) for unknown id', async () => {
    const svc = makeService();
    const result = await svc.processOrder('nonexistent');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(OrderNotFoundError);
    }
  });
});
