import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { CreateOrderSchema, type OrderResponseDto } from '@tcs-challenge-for-backend/contracts';
import {
  composeOrders,
  InvalidMoneyError,
  InvalidStateTransitionError,
  OrderNotFoundError,
  type Order,
} from '@tcs-challenge-for-backend/orders';
import { jwtAuth } from './middleware/auth';

type AppEnv = {
  JWT_SECRET: string;
  USE_AWS_DYNAMO?: string;
  USE_AWS_SQS?: string;
  FAIL_ABOVE_AMOUNT?: string;
  ORDERS_TABLE?: string;
  AWS_REGION?: string;
  DDB_ENDPOINT?: string;
  QUEUE_URL?: string;
};

function serializeOrder(order: Order): OrderResponseDto {
  return {
    id: order.id,
    status: order.status,
    customerId: order.customerId,
    amount: order.money.amount,
    currency: order.money.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    ...(order.failureReason !== undefined && { failureReason: order.failureReason }),
  };
}

export function makeApp(env: AppEnv) {
  const orderService = composeOrders({
    USE_AWS_DYNAMO: env.USE_AWS_DYNAMO,
    USE_AWS_SQS: env.USE_AWS_SQS,
    FAIL_ABOVE_AMOUNT: env.FAIL_ABOVE_AMOUNT,
    ORDERS_TABLE: env.ORDERS_TABLE,
    AWS_REGION: env.AWS_REGION,
    DDB_ENDPOINT: env.DDB_ENDPOINT,
    QUEUE_URL: env.QUEUE_URL,
  });

  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.use('/orders/*', jwtAuth(env.JWT_SECRET));

  app.post(
    '/orders',
    sValidator('json', CreateOrderSchema, (result, c) => {
      if (!result.success)
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed' } }, 422);
      return undefined;
    }),
    async (c) => {
      const dto = c.req.valid('json');
      const result = await orderService.registerOrder(dto);
      if (result.ok) {
        return c.json(serializeOrder(result.value), 201);
      }
      const error = result.error;
      if (error instanceof InvalidMoneyError) {
        return c.json({ error: { code: error.code, message: error.message } }, 422);
      }
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
    },
  );

  app.get('/orders', async (c) => {
    const result = await orderService.listOrders();
    if (!result.ok) return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
    return c.json(result.value.map(serializeOrder));
  });

  app.get('/orders/:id/audit', async (c) => {
    const id = c.req.param('id');
    const result = await orderService.getOrderAudit(id);
    if (result.ok) {
      return c.json(result.value);
    }
    const error = result.error;
    if (error instanceof OrderNotFoundError) {
      return c.json({ error: { code: error.code, message: error.message } }, 404);
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
  });

  app.get('/orders/:id', async (c) => {
    const id = c.req.param('id');
    const result = await orderService.getOrder(id);
    if (result.ok) {
      return c.json(serializeOrder(result.value));
    }
    const error = result.error;
    if (error instanceof OrderNotFoundError) {
      return c.json({ error: { code: error.code, message: error.message } }, 404);
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
  });

  app.post('/orders/:id/process', async (c) => {
    const id = c.req.param('id');
    const result = await orderService.processOrder(id);
    if (result.ok) {
      return c.json({ id, status: 'PENDING' }, 202);
    }
    const error = result.error;
    if (error instanceof OrderNotFoundError) {
      return c.json({ error: { code: error.code, message: error.message } }, 404);
    }
    if (error instanceof InvalidStateTransitionError) {
      return c.json({ error: { code: error.code, message: error.message } }, 409);
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
  });

  return app;
}
