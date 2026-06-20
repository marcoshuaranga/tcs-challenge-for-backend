## Why

Feature 0 delivered the shared primitives (`core/kernel`, `core/contracts`). Feature 1 builds the
first end-to-end user story: a client POSTs an order, it is persisted as `PENDING`, an audit entry
is written, and a `ProcessOrderMessage` is enqueued for the worker. This is the walking skeleton
that proves the hexagonal wiring — domain, application, infrastructure, and HTTP edge — works
together before any further features land.

## What Changes

- **New**: `core/orders/src/domain/` — `Order` aggregate (PENDING creation only), value objects
  (`OrderId`, `Money`), `AuditEntry` type.
- **New**: `core/orders/src/application/` — `OrderRepositoryPort`, `AuditRepositoryPort`,
  `MessagePublisherPort` interfaces; `CreateOrderHandler`, `RecordAuditEntryHandler` command
  handlers; `OrderAppService` facade (`.registerOrder()` only).
- **New**: `core/orders/src/infrastructure/` — `InMemoryOrderRepository`,
  `InMemoryAuditRepository`, `InMemoryMessagePublisher` (local adapters).
- **New**: `core/orders/src/index.ts` — `composeOrders(env)` wires adapters + handlers.
- **New**: `apps/orders-api/` — Hono app, JWT bearer middleware, `POST /orders` route,
  `GET /health` route.

## Capabilities

### New Capabilities

- `order-aggregate`: Order domain entity created in `PENDING` state, value objects (`OrderId`,
  `Money`), `AuditEntry` type, and the explicit `ORDER_CREATED` audit event.
- `register-order`: The complete `POST /orders` use case — `CreateOrderHandler` persists the order
  and records an audit entry, `MessagePublisherPort` enqueues the process message; wired via
  `composeOrders(env)` and exposed through the Hono API with JWT bearer validation.

### Modified Capabilities

<!-- none -->

## Impact

- Populates `core/orders/src/{domain,application,infrastructure}` and `core/orders/src/index.ts`
  for the first time. Feature 2 (process order) will extend these layers.
- Adds `apps/orders-api` as a working Hono app (local dev via `@hono/node-server`).
- In-memory adapters only; DynamoDB/SQS adapters are Feature 3+ scope (YAGNI).
- No changes to `core/kernel` or `core/contracts`.

## Non-Goals

- `ProcessOrderHandler`, `GetOrderHandler`, `ListOrdersHandler` — Feature 2/3.
- DynamoDB repository, SQS publisher — Feature 3 (real infra).
- `startProcessing()`, `complete()`, `fail()` domain transitions — Feature 2.
- `GET /orders/:id`, `GET /orders` — Feature 2/3.
- `apps/orders-worker` — Feature 2.
