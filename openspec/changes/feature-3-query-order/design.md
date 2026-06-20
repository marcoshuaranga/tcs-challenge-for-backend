## Context

Features 1 and 2 covered the write side: orders are created, processed, and their state
transitions are audited. Feature 3 adds the read side — two query endpoints that let a
customer inspect the current state of an order and its full audit trail.

This is a pure additive change: no domain logic changes, no new infrastructure dependencies,
no new packages. The only new things are two query handlers, two facade methods, one new
port method, one new in-memory adapter method, and two Hono routes.

## Goals / Non-Goals

**Goals:**
- Extend `AuditRepositoryPort` with `findByOrderId(orderId: string): Promise<AuditEntry[]>`.
- Implement `GetOrderHandler` and `GetOrderAuditHandler` (query handlers, no side effects).
- Add `OrderAppService.getOrder()` and `OrderAppService.getOrderAudit()`.
- Extend `InMemoryAuditRepository` with `findByOrderId`.
- Extend `composeOrders(env)` to wire the new handlers.
- Add `GET /orders/:id` and `GET /orders/:id/audit` to `apps/orders-api`.

**Non-Goals:**
- `GET /orders` (list all) — Feature 4.
- DynamoDB `findByOrderId` — Feature 5.
- `AuditResponseSchema` in `core/contracts` — the route serialises `AuditEntry` directly;
  no extra Zod schema is needed until the OpenAPI feature.

## Decisions

### Query handlers are plain classes with no side effects

`GetOrderHandler` and `GetOrderAuditHandler` only read; they never write to any repository,
publish messages, or call `RecordAuditEntryHandler`. This makes them trivially testable and
safe to call multiple times.

Alternative: route directly to the repository from the Hono handler. Rejected — bypassing the
application layer breaks the hexagonal boundary; the route would depend on infrastructure.

### AuditRepositoryPort gains findByOrderId — not a new port

`findByOrderId` is a natural read operation on the existing audit repository abstraction.
Introducing a separate `AuditQueryPort` would be premature (only one read method exists).

Alternative: separate read/write ports (CQRS split at the port level). Rejected — Simple
Design rule: no abstraction without 3 concrete cases. One read method does not justify a
new port interface.

### OrderAppService returns Result for both query methods

`getOrder` returns `Result<Order, AppError>` — `err(OrderNotFoundError)` when the id is
unknown. `getOrderAudit` returns `Result<AuditEntry[], AppError>` — also `err(OrderNotFoundError)`
when the order does not exist (audit trail for a non-existent order is meaningless).

Alternative: return `null` / empty array on not-found. Rejected — the rest of the facade
uses `Result` uniformly; mixing return styles would complicate the route mapping.

### GET /orders/:id/audit checks order existence before querying audit

The handler loads the order first (`OrderRepositoryPort.findById`). If not found, it throws
`OrderNotFoundError` immediately — no audit query is issued. This avoids returning an empty
array that the caller cannot distinguish from "order exists but has no audit entries".

Alternative: query audit directly and return empty array for unknown orders. Rejected —
ambiguous: an empty array could mean "no transitions yet" or "order doesn't exist".

### Route serialises AuditEntry directly — no extra Zod schema

`AuditEntry` is a plain TypeScript type (`orderId`, `event`, `previousState`, `newState`,
`timestamp`, `reason?`). The route serialises it with `c.json(entries)`. Hono's JSON
serialiser handles `Date` → ISO string automatically.

Alternative: add `AuditEntryResponseSchema` to `core/contracts`. Rejected — YAGNI: the
OpenAPI feature (Feature 6) will add `zod-to-openapi` wrappers; adding a schema now just
to validate output that the application layer already guarantees is over-engineering.

## Risks / Trade-offs

- **AuditEntry.timestamp serialised as ISO string**: Hono converts `Date` to ISO 8601 via
  `JSON.stringify`. Clients receive a string, not a `Date` object. This is standard REST
  behaviour and consistent with `OrderResponseSchema.createdAt` / `updatedAt`.
  Mitigation: document in the API contract (api-docs feature).
- **findByOrderId returns entries in insertion order (in-memory)**: The `InMemoryAuditRepository`
  stores entries in a `Map<orderId, AuditEntry[]>` and appends. Order is guaranteed for
  in-memory; DynamoDB will need a sort key on timestamp (Feature 5 concern, not here).

## Open Questions

None — decisions above are sufficient to implement Feature 3 without ambiguity.
