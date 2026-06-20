## Why

Features 1–3 let customers create, process, and inspect individual orders. A backoffice
operator has no way to see all registered orders at once. Feature 4 adds the `GET /orders`
endpoint that returns the full list, enabling backoffice oversight without touching any
existing write or query logic.

## What Changes

- **New**: `OrderRepositoryPort.listAll(): Promise<Order[]>` — extends the existing port.
- **New**: `ListOrdersHandler` — query handler returning all orders; no side effects.
- **New**: `OrderAppService.listOrders(): Promise<Result<Order[], never>>` — facade method.
- **New**: `InMemoryOrderRepository.listAll()` — extends the existing in-memory adapter.
- **New**: `GET /orders` route in `apps/orders-api` (200 with array / 401 without JWT).

## Capabilities

### New Capabilities

- `list-orders`: Return all registered orders as a JSON array — `ListOrdersHandler`,
  `OrderAppService.listOrders`, `GET /orders`.

### Modified Capabilities

<!-- none — OrderRepositoryPort gains a new method but no existing requirement changes -->

## Impact

- Extends `core/orders/src/application/ports.ts` (`OrderRepositoryPort` gains `listAll`).
- Extends `core/orders/src/infrastructure/in-memory-order-repository.ts` with `listAll`.
- Adds `ListOrdersHandler` and `OrderAppService.listOrders` to `core/orders`.
- Extends `core/orders/src/index.ts` (`composeOrders`) to wire `ListOrdersHandler`.
- Adds `GET /orders` route to `apps/orders-api/src/app.ts`.
- No changes to domain, state machine, audit, or the worker.

## Non-Goals

- DynamoDB `listAll` implementation — Feature 5.
- Pagination or filtering — not in scope; empty array or full array only.
- `ListOrdersResponseSchema` in `core/contracts` — routes reuse `OrderResponseSchema`
  from Feature 1; no extra Zod schema needed until the OpenAPI feature.
