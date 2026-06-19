# ADR-0007: Plain command/query handlers + cross-process transport

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

We want a clear command/query separation for the use cases, and the API must hand processing work
to the worker across process boundaries (SQS in AWS, in-memory locally). We are not using a
framework, so there is no built-in CQRS bus.

## Decision

Model use cases as **plain command/query handler classes** (`CreateOrderHandler`,
`ProcessOrderHandler`, `GetOrderHandler`, `ListOrdersHandler`, `RecordAuditEntryHandler`).
`OrderAppService` is a thin facade that delegates each method directly to the matching handler — no
event/command bus, no framework. Cross-process hand-off uses the **`MessagePublisherPort`**: the
API publishes a `ProcessOrderMessage`; the worker consumes it and calls `OrderAppService.processOrder`.

```
API:    OrderAppService.registerOrder() -> CreateOrderHandler (persist PENDING + audit)
                                          -> publish ProcessOrderMessage (MessagePublisherPort)
Worker: consume ProcessOrderMessage -> OrderAppService.processOrder() -> ProcessOrderHandler
```

## Options Considered

- **Plain handlers + transport port (chosen)** — explicit, testable, zero framework.
- **A framework CQRS bus** — free buses + sagas, but pulls in an application framework (rejected, ADR-0003).
- **Hand-rolled in-process command bus** (~30 lines) — possible, but unnecessary indirection for
  ~4 use cases; the facade calling handlers directly is clearer.

## Trade-off Analysis

Direct delegation keeps the call path obvious and unit-testable; the transport port is the single,
explicit seam between API and worker, swappable memory↔SQS without touching handlers.

## Consequences

- No magic dispatch — every call path is a direct method call.
- The only cross-process coupling is the `ProcessOrderMessage` contract.

## Action Items

1. [ ] Handlers as plain classes; `OrderAppService` delegates to them.
2. [ ] `MessagePublisherPort` + memory/SQS adapters; worker maps message → `processOrder`.
