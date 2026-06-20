import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { CreateOrderHandler } from './application/create-order-handler';
import { OrderAppService } from './application/order-app-service';
import { ProcessOrderHandler } from './application/process-order-handler';
import { RecordAuditEntryHandler } from './application/record-audit-entry-handler';
import { FakePaymentGateway } from './infrastructure/fake-payment-gateway';
import { InMemoryAuditRepository } from './infrastructure/in-memory-audit-repository';
import { InMemoryMessagePublisher } from './infrastructure/in-memory-message-publisher';
import { InMemoryOrderRepository } from './infrastructure/in-memory-order-repository';

export type Env = {
  USE_AWS_DYNAMO?: string;
  USE_AWS_SQS?: string;
  FAIL_ABOVE_AMOUNT?: string;
};

export function composeOrders(env: Env): OrderAppService {
  if (env.USE_AWS_DYNAMO === 'true' || env.USE_AWS_DYNAMO === '1')
    throw new Error('not implemented');
  if (env.USE_AWS_SQS === 'true' || env.USE_AWS_SQS === '1') throw new Error('not implemented');

  const failAboveAmount =
    env.FAIL_ABOVE_AMOUNT !== undefined ? Number(env.FAIL_ABOVE_AMOUNT) : Infinity;

  const clock = new SystemClock();
  const orderRepo = new InMemoryOrderRepository();
  const auditRepo = new InMemoryAuditRepository();
  const publisher = new InMemoryMessagePublisher();
  const auditHandler = new RecordAuditEntryHandler(auditRepo);
  const createHandler = new CreateOrderHandler(
    new UuidGenerator(),
    clock,
    orderRepo,
    auditHandler,
    publisher,
  );
  const processHandler = new ProcessOrderHandler(
    clock,
    orderRepo,
    auditHandler,
    new FakePaymentGateway(failAboveAmount),
  );

  return new OrderAppService(createHandler, processHandler);
}

export { OrderAppService } from './application/order-app-service';
export { InvalidMoneyError } from './domain/errors';
export { InvalidStateTransitionError } from '@tcs-challenge-for-backend/kernel';
