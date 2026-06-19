# ADR-0003: Manual composition root (no framework DI)

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

We need dependency wiring (ports → adapters) and a place to assemble the use-case handlers. A DI /
application framework was considered, but two facts undercut it here: Hono owns the HTTP edge
(ADR-0002), so a framework's strongest features (controllers, guards, pipes, interceptors) would go
unused; and the scope is a single bounded context with ~4 use cases and 6 ports — a dependency graph
that fits in a small, readable function. Framework DI would add runtime weight (relevant for Lambda
cold start) and decorator "magic" that conflicts with the project's explicit-and-testable principle.

## Decision

Use a **manual composition root**: a plain `composeOrders(env)` factory in `core/orders/src/index.ts`
that constructs adapters and handlers and returns the wired `OrderAppService`. No framework DI
container, no `reflect-metadata`. Apps call `composeOrders()` once at module load and pass the
facade to their driving adapter (Hono / SQS consumer).

## Options Considered

- **Manual composition root (chosen)** — explicit, zero deps, best cold start, fully testable.
- **NestJS standalone DI/CQRS container** — idiomatic DI/CQRS, but Hono already owns HTTP; adds
  cold-start weight and decorator indirection for a one-context app → over-engineering for this scope.
  (This is the one place this trade-off is recorded; the rest of the repo is framework-free by design.)
- **Lightweight DI container (tsyringe/awilix)** — less weight than a full framework, but still
  indirection for a graph this small; a plain function is clearer.

## Trade-off Analysis

A composition function makes "who builds what" visible at a glance and keeps the executable lean.
The cost is that there is no container to resolve graphs automatically — acceptable because the
graph is tiny and stable.

## Consequences

- `domain`, `application`, `infrastructure` are pure TypeScript with **no framework imports at all**.
- Wiring lives in `core/orders/src/index.ts` (`composeOrders`); apps stay framework-light (only Hono).
- No CQRS framework bus: `OrderAppService` delegates directly to plain handler instances (ADR-0007).
- Adapter selection is by per-adapter env flag inside the factory (ADR-0016).

## Action Items

1. [ ] `core/orders/src/index.ts` exposing `composeOrders(env): OrderAppService`.
2. [ ] Each app calls `composeOrders()` at module load and injects the facade into its adapter.
