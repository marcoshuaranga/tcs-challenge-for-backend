## ADDED Requirements

### Requirement: PaymentGatewayPort

The system SHALL define a `PaymentGatewayPort` interface in `core/orders/src/application/ports.ts`
with a single method `authorize(order: Order): Promise<{ approved: boolean }>`.
A return value of `{ approved: false }` SHALL represent a declined payment (business outcome),
not an infrastructure error.

#### Scenario: FakePaymentGateway approves orders below threshold

- **WHEN** `FakePaymentGateway.authorize(order)` is called and `order.money.amount <= FAIL_ABOVE_AMOUNT`
- **THEN** it returns `{ approved: true }`

#### Scenario: FakePaymentGateway declines orders above threshold

- **WHEN** `FakePaymentGateway.authorize(order)` is called and `order.money.amount > FAIL_ABOVE_AMOUNT`
- **THEN** it returns `{ approved: false }`

---

### Requirement: ProcessOrderHandler — two-step state transition

The system SHALL provide a `ProcessOrderHandler` that, given an `orderId: string`, SHALL:

1. Load the order via `OrderRepositoryPort.findById(orderId)`.
2. If the order is not found, throw `OrderNotFoundError`.
3. If the order is not in `PENDING` state, return immediately (idempotent no-op).
4. Call `order.startProcessing()` → save → call `RecordAuditEntryHandler` with `ORDER_PROCESSING_STARTED`.
5. Call `PaymentGatewayPort.authorize(order)`.
6. If approved: call `order.complete()` → save → call `RecordAuditEntryHandler` with `ORDER_COMPLETED`.
7. If not approved: call `order.fail('payment_declined')` → save → call `RecordAuditEntryHandler` with `ORDER_FAILED`.

#### Scenario: Happy path — order completes successfully

- **WHEN** `handler.execute({ orderId })` is called for a `PENDING` order and the gateway approves
- **THEN** the order status becomes `COMPLETED`, two audit entries are recorded (`ORDER_PROCESSING_STARTED`, `ORDER_COMPLETED`), and the order is saved twice

#### Scenario: Payment declined — order transitions to FAILED

- **WHEN** `handler.execute({ orderId })` is called for a `PENDING` order and the gateway declines
- **THEN** the order status becomes `FAILED` with `failureReason === 'payment_declined'`, two audit entries are recorded (`ORDER_PROCESSING_STARTED`, `ORDER_FAILED`)

#### Scenario: Idempotent no-op for non-PENDING order

- **WHEN** `handler.execute({ orderId })` is called for an order already in `PROCESSING`, `COMPLETED`, or `FAILED` state
- **THEN** the handler returns without saving, calling the gateway, or recording any audit entry

#### Scenario: OrderNotFoundError on missing order

- **WHEN** `handler.execute({ orderId })` is called and no order exists with that id
- **THEN** it throws `OrderNotFoundError` with `code === 'ORDER_NOT_FOUND'`

---

### Requirement: OrderAppService.processOrder

The system SHALL expose `OrderAppService.processOrder(orderId: string): Promise<Result<void, AppError>>`
that delegates to `ProcessOrderHandler` and returns `ok(undefined)` on success (including
idempotent no-op) or `err(appError)` on failure (`OrderNotFoundError`).

#### Scenario: Returns ok on successful processing

- **WHEN** `appService.processOrder(orderId)` is called for a valid PENDING order
- **THEN** it returns `{ ok: true, value: undefined }`

#### Scenario: Returns err on missing order

- **WHEN** `appService.processOrder('nonexistent-id')` is called
- **THEN** it returns `{ ok: false, error: <OrderNotFoundError> }`

---

### Requirement: POST /orders/:id/process HTTP endpoint

The system SHALL expose `POST /orders/:id/process` in `apps/orders-api`. The endpoint SHALL:

- Require a valid Bearer JWT (401 if absent or invalid).
- Load the order; return `404` with error envelope if not found.
- Return `409 Conflict` if the order is not in `PENDING` state.
- Publish a `ProcessOrderMessage` via `MessagePublisherPort` and return `202 Accepted`
  with `{ id, status }` on success.

#### Scenario: Valid request returns 202

- **WHEN** `POST /orders/:id/process` is called with a valid JWT and the order is PENDING
- **THEN** the response is `202` with body `{ id: <string>, status: 'PENDING' }`

#### Scenario: Missing JWT returns 401

- **WHEN** `POST /orders/:id/process` is called without an Authorization header
- **THEN** the response is `401 Unauthorized`

#### Scenario: Unknown order returns 404

- **WHEN** `POST /orders/:id/process` is called with a valid JWT and the order does not exist
- **THEN** the response is `404` with body `{ error: { code: 'ORDER_NOT_FOUND', message: <string> } }`

#### Scenario: Non-PENDING order returns 409

- **WHEN** `POST /orders/:id/process` is called and the order is already in `PROCESSING`, `COMPLETED`, or `FAILED`
- **THEN** the response is `409 Conflict` with body `{ error: { code: 'INVALID_STATE_TRANSITION', message: <string> } }`
