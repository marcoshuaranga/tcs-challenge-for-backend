import { SQSClient } from '@aws-sdk/client-sqs';
import { UuidGenerator, SystemClock } from '@tcs-challenge-for-backend/kernel';
import { CreateOrderHandler } from './application/create-order-handler';
import { GetOrderAuditHandler } from './application/get-order-audit-handler';
import { GetOrderHandler } from './application/get-order-handler';
import { ListOrdersHandler } from './application/list-orders-handler';
import { OrderAppService } from './application/order-app-service';
import type {
  AuditRepositoryPort,
  MessagePublisherPort,
  OrderRepositoryPort,
} from './application/ports';
import { ProcessOrderHandler } from './application/process-order-handler';
import { RecordAuditEntryHandler } from './application/record-audit-entry-handler';
import { DynamoAuditRepository } from './infrastructure/dynamo-audit-repository';
import { DynamoOrderRepository } from './infrastructure/dynamo-order-repository';
import { createOrdersTable } from './infrastructure/dynamo-table';
import { FakePaymentGateway } from './infrastructure/fake-payment-gateway';
import { InMemoryAuditRepository } from './infrastructure/in-memory-audit-repository';
import { InMemoryMessagePublisher } from './infrastructure/in-memory-message-publisher';
import { InMemoryOrderRepository } from './infrastructure/in-memory-order-repository';
import { SqsMessagePublisher } from './infrastructure/sqs-message-publisher';

export type Env = {
  USE_AWS_DYNAMO?: string;
  USE_AWS_SQS?: string;
  FAIL_ABOVE_AMOUNT?: string;
  ORDERS_TABLE?: string;
  AWS_REGION?: string;
  DDB_ENDPOINT?: string;
  QUEUE_URL?: string;
};

export function composeOrders(
  env: Env,
  adapters?: { publisher?: MessagePublisherPort },
): OrderAppService {
  const failAboveAmount =
    env.FAIL_ABOVE_AMOUNT !== undefined ? Number(env.FAIL_ABOVE_AMOUNT) : Infinity;

  const useDynamo = env.USE_AWS_DYNAMO === 'true' || env.USE_AWS_DYNAMO === '1';
  const useSqs = env.USE_AWS_SQS === 'true' || env.USE_AWS_SQS === '1';

  let orderRepo: OrderRepositoryPort;
  let auditRepo: AuditRepositoryPort;
  let publisher: MessagePublisherPort;

  if (useDynamo) {
    const { documentClient } = createOrdersTable({
      tableName: env.ORDERS_TABLE!,
      region: env.AWS_REGION!,
      endpoint: env.DDB_ENDPOINT,
    });
    orderRepo = new DynamoOrderRepository(documentClient, env.ORDERS_TABLE!);
    auditRepo = new DynamoAuditRepository(documentClient, env.ORDERS_TABLE!);
  } else {
    orderRepo = new InMemoryOrderRepository();
    auditRepo = new InMemoryAuditRepository();
  }

  if (useSqs) {
    publisher = new SqsMessagePublisher(new SQSClient({ region: env.AWS_REGION! }), env.QUEUE_URL!);
  } else {
    publisher = adapters?.publisher ?? new InMemoryMessagePublisher();
  }

  const clock = new SystemClock();
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
    listOrdersHandler,
    getOrderHandler,
    getOrderAuditHandler,
  );
}

export { OrderAppService } from './application/order-app-service';
export type { Order } from './domain/order';
export { InvalidMoneyError } from './domain/errors';
export { InMemoryMessagePublisher } from './infrastructure/in-memory-message-publisher';
export { InvalidStateTransitionError, OrderNotFoundError } from '@tcs-challenge-for-backend/kernel';
