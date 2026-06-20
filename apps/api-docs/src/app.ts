import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import {
  CreateOrderSchema,
  ErrorEnvelopeSchema,
  OrderResponseSchema,
} from '@tcs-challenge-for-backend/contracts';

export function makeDocsApp(apiUrl = 'http://localhost:3000'): Hono {
  const registry = new OpenAPIRegistry();

  registry.register('CreateOrder', CreateOrderSchema);
  registry.register('OrderResponse', OrderResponseSchema);
  registry.register('ErrorEnvelope', ErrorEnvelopeSchema);

  const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
  });

  registry.registerPath({
    method: 'get',
    path: '/health',
    summary: 'Health check',
    responses: {
      200: {
        description: 'API is healthy',
        content: {
          'application/json': { schema: z.object({ status: z.literal('ok') }) },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/orders',
    summary: 'Create an order',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: CreateOrderSchema } },
      },
    },
    responses: {
      201: {
        description: 'Order created',
        content: { 'application/json': { schema: OrderResponseSchema } },
      },
      409: {
        description: 'Invalid state transition',
        content: { 'application/json': { schema: ErrorEnvelopeSchema } },
      },
      422: {
        description: 'Validation error',
        content: { 'application/json': { schema: ErrorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/orders',
    summary: 'List all orders',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: 'List of orders',
        content: {
          'application/json': { schema: z.array(OrderResponseSchema) },
        },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/orders/{id}',
    summary: 'Get an order by id',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({ id: z.string().openapi({ example: 'ord-abc123' }) }),
    },
    responses: {
      200: {
        description: 'Order found',
        content: { 'application/json': { schema: OrderResponseSchema } },
      },
      404: {
        description: 'Order not found',
        content: { 'application/json': { schema: ErrorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/orders/{id}/audit',
    summary: 'Get audit trail for an order',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({ id: z.string().openapi({ example: 'ord-abc123' }) }),
    },
    responses: {
      200: {
        description: 'Audit entries',
        content: {
          'application/json': {
            schema: z.array(
              z.object({
                orderId: z.string(),
                fromStatus: z.string().nullable(),
                toStatus: z.string(),
                occurredAt: z.string().datetime(),
              }),
            ),
          },
        },
      },
      404: {
        description: 'Order not found',
        content: { 'application/json': { schema: ErrorEnvelopeSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/orders/{id}/process',
    summary: 'Trigger order processing',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({ id: z.string().openapi({ example: 'ord-abc123' }) }),
    },
    responses: {
      202: {
        description: 'Processing enqueued',
        content: {
          'application/json': {
            schema: z.object({ id: z.string(), status: z.literal('PENDING') }),
          },
        },
      },
      404: {
        description: 'Order not found',
        content: { 'application/json': { schema: ErrorEnvelopeSchema } },
      },
      409: {
        description: 'Invalid state transition',
        content: { 'application/json': { schema: ErrorEnvelopeSchema } },
      },
    },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'TCS Order Processing API',
      version: '1.0.0',
      description: 'Async order processing platform — TCS technical challenge.',
    },
    servers: [{ url: apiUrl.replace(/\/$/, ''), description: 'Orders API' }],
  });

  const app = new Hono();

  app.use('*', cors());

  app.get('/openapi.json', (c) => c.json(document));

  const scalarHandler = Scalar({ spec: { url: '/openapi.json' } });
  app.get('/', scalarHandler);

  return app;
}
