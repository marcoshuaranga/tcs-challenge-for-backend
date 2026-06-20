# ADR-0004: Hexagonal layering with an OrderAppService facade

**Status:** Accepted · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Two driving adapters (API, worker) must reach identical core behavior.

## Decision

`core/orders/src/application` exposes `OrderAppService` (`registerOrder`, `getOrder`, `listOrders`,
`processOrder`) delegating to plain command/query handlers. Domain stays pure; ports are interfaces;
infrastructure implements them.

## Options Considered

- **Facade + ports (chosen)** — single core surface for both apps.
- **Apps call handlers directly** — leaks handler wiring into the driving adapters.

## Trade-off Analysis

A facade hides bus mechanics and gives both driving adapters one stable entry point, at the cost
of a thin extra layer.

## Consequences

- Swapping HTTP framework, queue, or DB never touches domain/application.
- The core has four internal layers: `domain`, `application`, `infrastructure` (all pure
  TypeScript, **no framework**), and `composition` (`core/orders/src/index.ts`) — the wiring layer
  that builds adapters/handlers and returns `OrderAppService` (ADR-0003, ADR-0016).

## Action Items

1. [ ] Define ports as plain interfaces: `OrderRepositoryPort`, `AuditRepositoryPort`,
       `MessagePublisherPort`, `PaymentGatewayPort`, `ClockPort`, `IdGeneratorPort`.
