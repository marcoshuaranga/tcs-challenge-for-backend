## Context

Feature 0 delivered `core/kernel` (Result, errors, ports) and `core/contracts` (Zod schemas).
`core/orders` exists as an empty scaffold. This change populates all three layers of
`core/orders` (domain, application, infrastructure) and `apps/orders-api` to make User Story 1
(Registrar orden) runnable end-to-end locally with in-memory adapters.

Architecture and tooling decisions are settled in the ADRs — this doc covers only the
feature-specific decisions needed to implement without ambiguity.

## Goals / Non-Goals

**Goals:**
- Implement `Order` aggregate (PENDING creation only), `OrderId`, `Money` value objects, `AuditEntry`.
- Wire `CreateOrderHandler`, `RecordAuditEntryHandler`, `OrderAppService` with three in-memory
  adapters and `composeOrders(env)`.
- Expose `POST /orders` and `GET /health` via a Hono app in `apps/orders-api`.
- All domain + handler logic covered by unit tests in `core/orders/test/`.

**Non-Goals:**
- State machine transitions beyond PENDING (Feature 2).
- DynamoDB / SQS adapters (Feature 3 onwards).
- `apps/orders-worker` (Feature 2).
- Query handlers (`GetOrderHandler`, `ListOrdersHandler`) — Feature 2/3.

## Decisions

### Domain as plain TypeScript classes (no ORM, no decorators)

`Order`, `OrderId`, `Money` are plain TypeScript classes with no framework imports. They live in
`core/orders/src/domain/` and are the only layer that must never import Hono, AWS SDKs, or
DynamoDB tooling. Enforced by review (no lint plugin for cross-package imports per ADR-0015).

Alternative: domain records as plain objects. Rejected — class methods (`Order.create`) give a
natural place for invariant checks and allow `instanceof` at boundaries without a type-brand.

### Money validation in the domain, not at the HTTP boundary only

`Money.create(amount, currency)` throws `InvalidMoneyError` (a new `AppError` subclass) for
non-positive amounts or invalid currencies. This mirrors the Zod validation in `CreateOrderSchema`
but at the domain layer — so the invariant holds regardless of caller.

Alternative: trust Zod alone. Rejected — domain invariants must not depend on the HTTP layer
being the only entry point. The worker will also create orders in tests, bypassing Hono.

### OrderAppService wraps handler calls in Result

`OrderAppService.registerOrder` catches domain errors thrown by `CreateOrderHandler` and wraps
them in `err(appError)`, returning `Result<string, AppError>`. The Hono route unwraps the result
and maps to HTTP status codes. This is the single unwrap point (per design.md risk note).

Alternative: let the handler throw and catch in the route. Rejected — mixing transport error
handling into the application service blurs the port boundary.

### InMemory adapters with the same interface as prod adapters

`InMemoryOrderRepository`, `InMemoryAuditRepository`, `InMemoryMessagePublisher` implement the
same `*Port` interfaces as the future DynamoDB/SQS adapters. `composeOrders(env)` selects by
env flag. This means all handler tests run against real (in-memory) adapter code, not mocks.

Alternative: use Vitest mocks for ports in handler tests. Rejected per CLAUDE.md: domain errors
from mock/prod divergence were a known failure mode.

### JWT middleware: lightly-signed verify, static secret

US-5 requires Bearer JWT but not OAuth. The middleware verifies a JWT with `HS256` and a
`JWT_SECRET` env var (from `.env`). On missing/invalid token → 401. The demo script issues
tokens with the same secret. No refresh, no JWKS.

Dependency: `hono/jwt` (built into Hono core, zero extra packages).

Alternative: no-auth or API key. Rejected — the challenge explicitly requires JWT bearer.

### apps/orders-api package setup

`apps/orders-api` runs locally with `@hono/node-server` (`pnpm add @hono/node-server`). On AWS
it will use `hono/aws-lambda` (Future Feature). Local dev: `pnpm --filter orders-api dev`.
The package adds `hono` as a dependency. TypeScript settings extend `tsconfig.node.json`.

### composeOrders(env) reads typed config, not raw process.env

`composeOrders` accepts an `Env` object (typed via Zod or plain interface) rather than reading
`process.env` directly. The app entry points pass `process.env` after minimal parsing. This
keeps the composition root testable without environment variable side effects.

## Risks / Trade-offs

- **Money validation duplication**: `Money.create()` and `CreateOrderSchema` both enforce the
  same rules. If one changes, both must change. Mitigation: `CreateOrderSchema` is the API boundary
  contract; `Money` is the domain invariant. They serve different purposes and are tested
  independently.
- **InMemory adapter isolation**: tests that call `CreateOrderHandler` in isolation share
  adapter instances only when constructed together. Mitigation: each test constructs its own
  adapter instances to avoid state leakage.
- **`composeOrders` has no DynamoDB/SQS yet**: env flags `USE_AWS_DYNAMO`/`USE_AWS_SQS` will
  be checked but fall back to in-memory if true (not implemented). Mitigation: guard with a
  clear `TODO` comment and throw if a real adapter is requested but not available.

## Open Questions

None — all decisions above are sufficient to implement Feature 1 without ambiguity.
The only deferred items are intentional YAGNI deferrals noted in Non-Goals.
