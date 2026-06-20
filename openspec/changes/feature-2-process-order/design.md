## Context

Feature 1 delivered the walking skeleton: `POST /orders` creates an order in `PENDING` and
publishes a `ProcessOrderMessage` to `MessagePublisherPort`. The message is enqueued but never
consumed — the async loop is open. Feature 2 closes it by adding the state machine transitions,
the `ProcessOrderHandler` that runs the business logic, the `PaymentGatewayPort` that decides
the final outcome, and the `orders-worker` app that consumes the message.

All architecture decisions (hexagonal layering, composition root, adapter selection, explicit
audit, SQS + DLQ) are settled in the ADRs and CLAUDE.md invariants. This doc covers only the
decisions specific to this feature.

## Goals / Non-Goals

**Goals:**

- Implement `Order.startProcessing()`, `Order.complete()`, `Order.fail(reason)` on the aggregate.
- Add `PaymentGatewayPort` interface and `FakePaymentGateway` adapter.
- Implement `ProcessOrderHandler` (idempotent) with explicit audit on every transition.
- Add `OrderAppService.processOrder()` facade method.
- Extend `composeOrders(env)` to wire `PaymentGatewayPort` and `ProcessOrderHandler`.
- Add `POST /orders/:id/process` to `apps/orders-api` (202 / 404 / 409).
- Create `apps/orders-worker/` — poll-loop (local) and Lambda SQS handler (prod).

**Non-Goals:**

- DynamoDB / SQS real adapters — Feature 5.
- `GetOrderHandler`, `ListOrdersHandler`, query routes — Feature 3/4.
- `apps/iac` — Feature 7.

## Decisions

### Two-step state transition: PENDING → PROCESSING → COMPLETED | FAILED

`ProcessOrderHandler` performs two ordered transitions:

1. `order.startProcessing()` → PROCESSING — saved and audited before calling the gateway.
2. `PaymentGatewayPort.authorize(order)` → `{ approved: boolean }`.
3. If approved: `order.complete()` → COMPLETED — saved and audited.
4. If not approved: `order.fail('payment_declined')` → FAILED — saved and audited.

Alternative: single transition directly to terminal state. Rejected — the intermediate
`PROCESSING` state is observable (a concurrent `GET /orders/:id` during gateway call would
show the order in flight) and is required by the state machine spec (ADR-0008).

### PaymentGatewayPort returns a value, not an exception

`PaymentGatewayPort.authorize(order): Promise<{ approved: boolean }>` returns a plain result
object. `FAILED` is a normal business outcome, not an error path.

Alternative: throw `PaymentDeclinedError`. Rejected — ADR-0013 establishes that `FAILED` is
a business outcome distinct from infrastructure failures. An exception would conflate the
two and complicate idempotency logic.

### ProcessOrderHandler is idempotent: no-op if order not in PENDING

If `findById` returns an order whose `status !== 'PENDING'`, the handler returns immediately
without calling the gateway, writing audit, or saving. This is the correct at-least-once
delivery contract for SQS (ADR-0006).

Alternative: throw `InvalidStateTransitionError` on re-delivery. Rejected — this would land
the message in the DLQ on legitimate duplicates, producing false infra alarms.

### Worker: same handler, two runtime modes

`apps/orders-worker` shares `composeOrders(env)` with the API. In local mode it polls
`InMemoryMessagePublisher.drain()` in a tight loop. In prod it exports a Lambda handler
that parses an `SQSEvent` and calls `ProcessOrderHandler.execute()` per record.

Alternative: separate handler code per runtime. Rejected — two copies of the same business
logic diverge. One `ProcessOrderHandler`, two driving adapters.

### POST /orders/:id/process: fire-and-forget at the HTTP layer

The endpoint loads the order (404 if not found), checks that it is in `PENDING` (409 if not),
publishes via `MessagePublisherPort`, and returns `202 Accepted` immediately. It does not wait
for the worker to complete processing.

Alternative: synchronous processing in the route handler. Rejected — the challenge
explicitly requires async processing via SQS (ADR-0006). The 202 signals accepted, not done.

### OrderNotFoundError already exists in core/kernel

`OrderNotFoundError` (code `ORDER_NOT_FOUND`) was introduced in Feature 0. The
`POST /orders/:id/process` route maps it to 404. No new error type needed.

## Risks / Trade-offs

- **Order stuck in PROCESSING**: If the Lambda crashes after `startProcessing()` but before
  `complete()`/`fail()`, the order remains in `PROCESSING`. SQS will redeliver — but
  `ProcessOrderHandler` is only idempotent against `PENDING`, not `PROCESSING`.
  Mitigation: acceptable for this challenge scope; production would add a timeout/compensating
  transition.
- **FakePaymentGateway reads env at construction**: `FAIL_ABOVE_AMOUNT` is parsed once in
  `composeOrders`. Changing the env var at runtime has no effect.
  Mitigation: document this in the adapter; consistent with how all adapters behave.

## Open Questions

None — decisions above are sufficient to implement Feature 2 without ambiguity.
