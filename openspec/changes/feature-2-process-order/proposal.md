## Why

Feature 1 delivered `POST /orders` — orders are created in `PENDING` and a `ProcessOrderMessage`
is enqueued. Feature 2 closes the loop: it implements the state machine transitions, the worker
that consumes the message, and the payment gateway that determines the final outcome (`COMPLETED`
or `FAILED`).

## What Changes

- **New**: `Order.startProcessing()`, `Order.complete()`, `Order.fail(reason)` — state machine
  transitions with `InvalidStateTransitionError` guards on the `Order` aggregate.
- **New**: `PaymentGatewayPort` interface in `core/orders/src/application/ports.ts`.
- **New**: `ProcessOrderHandler` — idempotent; transitions PENDING → PROCESSING → COMPLETED |
  FAILED; calls `RecordAuditEntryHandler` on every transition.
- **New**: `FakePaymentGateway` in infrastructure — declines when `amount > FAIL_ABOVE_AMOUNT`.
- **New**: `OrderAppService.processOrder()` facade method.
- **New**: `composeOrders(env)` extended to wire `PaymentGatewayPort` + `ProcessOrderHandler`.
- **New**: `POST /orders/:id/process` route in `apps/orders-api` — returns 202, 404, or 409.
- **New**: `apps/orders-worker/` — poll-loop (local) and Lambda SQS handler (prod).

## Capabilities

### New Capabilities

- `order-state-machine`: State machine transitions on the `Order` aggregate — `startProcessing()`,
  `complete()`, `fail(reason)` — each guarded to throw `InvalidStateTransitionError` on illegal moves.
- `process-order`: The full async processing use case — `ProcessOrderHandler` (idempotent),
  `PaymentGatewayPort`, `FakePaymentGateway`, explicit audit on every transition,
  `OrderAppService.processOrder()`, and the `POST /orders/:id/process` trigger endpoint.
- `orders-worker`: Worker runtime — poll-loop for local dev (drains `InMemoryMessagePublisher`)
  and Lambda SQS handler for prod.

### Modified Capabilities

<!-- none -->

## Impact

- Extends `core/orders/src/domain/order.ts` with three new transition methods.
- Extends `core/orders/src/application/ports.ts` with `PaymentGatewayPort`.
- Extends `core/orders/src/infrastructure/` with `FakePaymentGateway`.
- Extends `core/orders/src/index.ts` (`composeOrders`) to wire the new handler and gateway.
- Extends `apps/orders-api/src/` with `POST /orders/:id/process` route.
- Creates `apps/orders-worker/` as a new package in the monorepo.
- `FAIL_ABOVE_AMOUNT` env var must be present in `.env` (already in `.env.example`).

## Non-Goals

- `GetOrderHandler`, `ListOrdersHandler`, `GET /orders/:id`, `GET /orders` — Feature 3/4.
- DynamoDB/SQS real adapters — Feature 5.
- `apps/iac` — Feature 7.
