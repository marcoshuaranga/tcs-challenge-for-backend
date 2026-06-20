import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { CreateOrderHandler } from './application/create-order-handler';
import { GetOrderAuditHandler } from './application/get-order-audit-handler';
import { GetOrderHandler } from './application/get-order-handler';
import { ListOrdersHandler } from './application/list-orders-handler';
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
  const listOrdersHandler = new ListOrdersHandler(orderRepo);
  const getOrderHandler = new GetOrderHandler(orderRepo);
  const getOrderAuditHandler = new GetOrderAuditHandler(orderRepo, auditRepo);

  return new OrderAppService(
    createHandler,
    processHandler,
    orderRepo,
    listOrdersHandler,
    getOrderHandler,
    getOrderAuditHandler,
  );
}

export { OrderAppService } from './application/order-app-service';
export { InvalidMoneyError } from './domain/errors';
export { InMemoryMessagePublisher } from './infrastructure/in-memory-message-publisher';
export { InvalidStateTransitionError, OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
