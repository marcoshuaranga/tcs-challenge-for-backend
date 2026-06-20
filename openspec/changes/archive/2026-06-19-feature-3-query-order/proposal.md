## Why

Features 1 and 2 allow customers to register and trigger processing of orders, but there is
no way to check what happened. Feature 3 adds the read side: a customer can query the current
state of an order and inspect its full audit trail of state transitions.

## What Changes

- **New**: `AuditRepositoryPort.findByOrderId(orderId)` method — extends the existing port.
- **New**: `GetOrderHandler` — query handler returning an order by id.
- **New**: `GetOrderAuditHandler` — query handler returning all audit entries for an order.
- **New**: `OrderAppService.getOrder()` and `OrderAppService.getOrderAudit()` facade methods.
- **New**: `InMemoryAuditRepository.findByOrderId()` — extends the existing in-memory adapter.
- **New**: `GET /orders/:id` route in `apps/orders-api` (200 / 401 / 404).
- **New**: `GET /orders/:id/audit` route in `apps/orders-api` (200 / 401 / 404).

## Capabilities

### New Capabilities

- `query-order`: Retrieve a single order by id — `GetOrderHandler`, `OrderAppService.getOrder`,
  `GET /orders/:id`.
- `query-audit`: Retrieve the audit trail for an order — `GetOrderAuditHandler`,
  `OrderAppService.getOrderAudit`, `GET /orders/:id/audit`.

### Modified Capabilities

<!-- none — AuditRepositoryPort gains a new method but no existing requirement changes -->

## Impact

- Extends `core/orders/src/application/ports.ts` (`AuditRepositoryPort` gains `findByOrderId`).
- Extends `core/orders/src/infrastructure/in-memory-audit-repository.ts` with `findByOrderId`.
- Adds two query handlers and two facade methods to `core/orders`.
- Extends `core/orders/src/index.ts` (`composeOrders`) to wire the new handlers.
- Adds two routes to `apps/orders-api/src/app.ts`.
- No changes to domain, existing ports, or the worker.

## Non-Goals

- `GET /orders` (list all) — Feature 4.
- DynamoDB `findByOrderId` implementation — Feature 5.
- `AuditResponseSchema` in `core/contracts` — not required; the route serialises
  `AuditEntry` directly (plain object, no extra Zod schema needed for this feature).
