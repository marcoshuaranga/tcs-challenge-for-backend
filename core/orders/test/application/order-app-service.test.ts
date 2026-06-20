import { describe, expect, it } from 'vitest';
import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { OrderAppService } from '../../src/application/order-app-service';
import { CreateOrderHandler } from '../../src/application/create-order-handler';
import { RecordAuditEntryHandler } from '../../src/application/record-audit-entry-handler';
import { InMemoryOrderRepository } from '../../src/infrastructure/in-memory-order-repository';
import { InMemoryAuditRepository } from '../../src/infrastructure/in-memory-audit-repository';
import { InMemoryMessagePublisher } from '../../src/infrastructure/in-memory-message-publisher';
import { InvalidMoneyError } from '../../src/domain/errors';

function makeService() {
  const orderRepo = new InMemoryOrderRepository();
  const auditRepo = new InMemoryAuditRepository();
  const publisher = new InMemoryMessagePublisher();
  const auditHandler = new RecordAuditEntryHandler(auditRepo);
  const createHandler = new CreateOrderHandler(
    new UuidGenerator(),
    new SystemClock(),
    orderRepo,
    auditHandler,
    publisher,
  );
  return new OrderAppService(createHandler);
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
});
