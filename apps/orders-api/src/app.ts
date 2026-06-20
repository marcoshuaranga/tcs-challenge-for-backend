import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { CreateOrderSchema } from '@tcs-challenge-for-backend/contracts';
import {
  composeOrders,
  InvalidMoneyError,
  InvalidStateTransitionError,
} from '@tcs-challenge-for-backend/orders';
import { jwtAuth } from './middleware/auth';

type AppEnv = {
  JWT_SECRET: string;
  USE_AWS_DYNAMO?: string;
  USE_AWS_SQS?: string;
};

export function makeApp(env: AppEnv) {
  const orderService = composeOrders({
    USE_AWS_DYNAMO: env.USE_AWS_DYNAMO,
    USE_AWS_SQS: env.USE_AWS_SQS,
  });

  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.use('/orders', jwtAuth(env.JWT_SECRET));

  app.post(
    '/orders',
    sValidator('json', CreateOrderSchema, (result, c) => {
      if (!result.success) return c.json({ error: 'Validation failed' }, 422);
    }),
    async (c) => {
      const dto = c.req.valid('json');
      const result = await orderService.registerOrder(dto);
      if (result.ok) {
        return c.json({ id: result.value, status: 'PENDING' }, 201);
      }
      const error = result.error;
      if (error instanceof InvalidMoneyError) {
        return c.json({ error: error.message }, 422);
      }
      if (error instanceof InvalidStateTransitionError) {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: 'Internal error' }, 500);
    },
  );

  return app;
}
