## Context

Features 1–3 introduced the full write path (create, process) and the single-order read
path (query by id, query audit). Feature 4 completes the read side by adding `GET /orders`,
which returns all registered orders. This is a backoffice concern: no new domain logic,
no state machine changes, no audit writes. The change is purely additive.

## Goals / Non-Goals

**Goals:**
- Extend `OrderRepositoryPort` with `listAll(): Promise<Order[]>`.
- Implement `ListOrdersHandler` (query handler, no side effects).
- Add `OrderAppService.listOrders(): Promise<Result<Order[], never>>`.
- Extend `InMemoryOrderRepository` with `listAll()`.
- Extend `composeOrders(env)` to wire `ListOrdersHandler`.
- Add `GET /orders` route to `apps/orders-api` (200 / 401).

**Non-Goals:**
- Pagination or filtering — not in scope; the list is always complete.
- DynamoDB `listAll` implementation — Feature 5.
- `ListOrdersResponseSchema` in `core/contracts` — Feature 6 (OpenAPI).
- Ordering guarantees beyond in-memory insertion order — Feature 5 concern (GSI1).

## Decisions

### listAll returns Order[] — Result type is Result<Order[], never>

`listAll` always succeeds: an empty store returns `[]`, not an error. The facade method
returns `Result<Order[], never>` to stay consistent with the Result-uniform facade surface
introduced in Features 1–3, while making it clear at the type level that this path cannot
fail at the application layer.

Alternative: return `Order[]` directly without wrapping in Result. Rejected — the rest of
`OrderAppService` returns `Result` uniformly; mixing return styles in the same class would
complicate route mapping and surprise readers.

### OrderRepositoryPort gains listAll — not a new port

`listAll` is a natural read operation on the existing order repository abstraction.
Introducing a separate `OrderQueryPort` would be premature (Simple Design rule: no
abstraction without 3 concrete cases; we have one read method).

Alternative: separate read/write ports. Rejected — YAGNI. Feature 5 will introduce the
DynamoDB adapter for this port; if a split were ever needed, it would happen at that point
with a concrete second case to justify it.

### Route returns 200 with empty array, not 204

When no orders exist, `GET /orders` returns `200 []`. A `204 No Content` would require
clients to special-case an absent body. An empty JSON array is unambiguous and consistent
with standard list-resource semantics.

Alternative: 204 when empty. Rejected — unnecessary branching in client code; empty array
is the canonical REST list response.

### Route serialises orders using OrderResponseSchema — no new Zod schema

`GET /orders` returns an array of the same shape as `GET /orders/:id` (201 response). The
existing `OrderResponseSchema` from `core/contracts` is reused directly; the route maps
each `Order` to `OrderResponseDto` and wraps in an array.

Alternative: add a dedicated `ListOrdersResponseSchema`. Rejected — YAGNI; Feature 6
(OpenAPI) will add `zod-to-openapi` wrappers and is the right place to formalise the
list-response schema.

### In-memory adapter returns orders in insertion order

`InMemoryOrderRepository` stores orders in a `Map<id, Order>`. `listAll` returns
`[...this.store.values()]`, which preserves insertion order in JS. This is sufficient for
local development and tests. DynamoDB ordering will be handled via the GSI1 sort key in
Feature 5.

Alternative: sort by `createdAt` in the adapter. Rejected — the spec makes no ordering
guarantee; adding a sort is premature and couples the adapter to a business rule that
belongs in a future explicit decision.

## Risks / Trade-offs

- **No ordering guarantee at the port level**: `listAll` returns `Order[]` with no
  ordering contract. In-memory is insertion order; DynamoDB (Feature 5) will need GSI1
  ordering. Clients should not rely on order until Feature 5 formalises it.
  Mitigation: document in api-docs (Feature 6).
- **No pagination**: a large order set returns everything in one response. Acceptable for
  the challenge scope; pagination is a non-goal per the brief.

## Open Questions

None — decisions above are sufficient to implement Feature 4 without ambiguity.
