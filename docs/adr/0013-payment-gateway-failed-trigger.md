# ADR-0013: PaymentGatewayPort as the FAILED trigger

**Status:** Accepted · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

"Procesar orden" must be able to reach `FAILED`, but the create body is only
`{ customerId, amount, currency }` — there is no field to carry a "make this fail" signal, and a
hidden hack would contradict the "no magic / fully testable" principle.

## Decision

Model failure as an explicit, swappable dependency. The worker calls
`PaymentGatewayPort.authorize(order)`. The fake adapter (`FakePaymentGateway`) declines when
`amount > FAIL_ABOVE_AMOUNT` (env, default 10000), otherwise approves. `ProcessOrderHandler`
maps approved → `complete()`, declined → `fail(reason)`.

## Options Considered

| Option                                    | Deterministic | Demoable on cue | Testable         | Architectural honesty                           |
| ----------------------------------------- | ------------- | --------------- | ---------------- | ----------------------------------------------- |
| Gateway port + threshold adapter (chosen) | Yes           | Yes             | Yes              | High (real failure source)                      |
| Plain threshold rule (no port)            | Yes           | Yes             | Yes              | Medium                                          |
| Currency allow-list                       | Yes           | Yes             | Yes              | Belongs at validation (400), muddies processing |
| Magic/sentinel value                      | Yes           | Yes             | Yes              | Low (looks like leaked test scaffolding)        |
| Random probability                        | No            | No              | If RNG is a port | Realistic but non-deterministic for demos       |

## Trade-off Analysis

The port gives the deterministic, demoable, testable trigger of a threshold rule plus a clean
place for the `FAILED` reason and a swap point for a real gateway later — at the cost of one
extra port + adapter.

## Consequences

- `FAILED` (business outcome) is clearly distinct from the DLQ (infra failure after retries).
- A real payment integration is a drop-in adapter replacement.

## Action Items

1. [ ] `PaymentGatewayPort` in application; `FakePaymentGateway` in infrastructure.
2. [ ] `ProcessOrderHandler` maps authorize() result to complete()/fail(reason).
3. [ ] Tests: approve at/below threshold, decline above with reason.
