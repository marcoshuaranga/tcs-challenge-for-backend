## ADDED Requirements

### Requirement: Worker local mode — poll-loop

In local mode (`USE_AWS_SQS` not set), the `orders-worker` app SHALL poll
`InMemoryMessagePublisher.drain()` in a continuous loop, calling `ProcessOrderHandler.execute()`
for each drained `orderId`. The worker SHALL share the same `composeOrders(env)` instance as
the API when running in combined local mode.

#### Scenario: Worker drains and processes a published message

- **WHEN** `CreateOrderHandler` publishes a `ProcessOrderMessage` to `InMemoryMessagePublisher`
  and the poll-loop runs
- **THEN** `ProcessOrderHandler.execute()` is called with the published `orderId` and the order
  transitions out of `PENDING`

#### Scenario: Worker is a no-op when queue is empty

- **WHEN** `InMemoryMessagePublisher.drain()` returns an empty array
- **THEN** the poll-loop iterates without calling `ProcessOrderHandler`

---

### Requirement: Worker prod mode — Lambda SQS handler

In prod mode (`USE_AWS_SQS=true`), the `orders-worker` app SHALL export a Lambda handler
compatible with `SQSEvent`. For each `SQSRecord` in the event, it SHALL parse the body as
`{ orderId: string }` and call `ProcessOrderHandler.execute({ orderId })`.
Failed records SHALL be caught and logged; they SHALL NOT prevent other records in the
same batch from being processed (partial-batch failure pattern).

#### Scenario: Lambda handler processes a valid SQS record

- **WHEN** the Lambda handler receives an `SQSEvent` with one record containing `{ orderId }`
- **THEN** `ProcessOrderHandler.execute({ orderId })` is called exactly once

#### Scenario: Lambda handler skips invalid records without crashing

- **WHEN** an `SQSRecord` body cannot be parsed as `{ orderId: string }`
- **THEN** the error is logged and the handler continues processing remaining records
