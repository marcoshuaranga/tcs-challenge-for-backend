## ADDED Requirements

### Requirement: OrderRepositoryPort
The system SHALL define an `OrderRepositoryPort` interface in `core/orders/src/application`
with methods `save(order: Order): Promise<void>` and
`findById(id: string): Promise<Order | null>`.

#### Scenario: InMemoryOrderRepository satisfies port
- **WHEN** `InMemoryOrderRepository` is assigned to a variable of type `OrderRepositoryPort`
- **THEN** TypeScript SHALL accept the assignment without error

---

### Requirement: AuditRepositoryPort
The system SHALL define an `AuditRepositoryPort` interface with method
`append(entry: AuditEntry): Promise<void>`.

#### Scenario: InMemoryAuditRepository satisfies port
- **WHEN** `InMemoryAuditRepository` is assigned to a variable of type `AuditRepositoryPort`
- **THEN** TypeScript SHALL accept the assignment without error

---

### Requirement: MessagePublisherPort
The system SHALL define a `MessagePublisherPort` interface with method
`publishProcessOrder(orderId: string): Promise<void>`.

#### Scenario: InMemoryMessagePublisher satisfies port
- **WHEN** `InMemoryMessagePublisher` is assigned to a variable of type `MessagePublisherPort`
- **THEN** TypeScript SHALL accept the assignment without error

---

### Requirement: RecordAuditEntryHandler
The system SHALL provide a `RecordAuditEntryHandler` command handler that accepts an `AuditEntry`
and appends it to the `AuditRepositoryPort`. It SHALL be called explicitly by other handlers on
every state change — never implicitly.

#### Scenario: Audit entry is appended on execute
- **WHEN** `handler.execute(entry)` is called
- **THEN** the entry is available via the audit repository

---

### Requirement: CreateOrderHandler
The system SHALL provide a `CreateOrderHandler` that, given a `CreateOrderDto`, SHALL:
1. Create an `OrderId` using `IdGeneratorPort`.
2. Create a `Money` value object from the DTO's `amount` and `currency`.
3. Create an `Order` via `Order.create()`.
4. Persist the order via `OrderRepositoryPort.save()`.
5. Call `RecordAuditEntryHandler.execute()` with an `ORDER_CREATED` `AuditEntry`.
6. Publish a `ProcessOrderMessage` via `MessagePublisherPort.publishProcessOrder(orderId)`.
7. Return the `orderId` string.

#### Scenario: Handler creates order and returns id
- **WHEN** `handler.execute({ customerId: 'C1', amount: 100, currency: 'USD' })` is called
- **THEN** it returns a non-empty string (the order id), the order is saved in the repository,
  and an audit entry with event `ORDER_CREATED` is recorded

#### Scenario: A process message is published after creation
- **WHEN** `handler.execute(...)` completes successfully
- **THEN** `MessagePublisherPort.publishProcessOrder` is called exactly once with the new orderId

#### Scenario: Invalid money causes failure before save
- **WHEN** `handler.execute({ customerId: 'C1', amount: 0, currency: 'USD' })` is called
- **THEN** it throws `InvalidMoneyError` and no order is saved

---

### Requirement: OrderAppService.registerOrder
The system SHALL expose `OrderAppService` as the single application facade. Its
`registerOrder(dto: CreateOrderDto): Promise<Result<string, AppError>>` method SHALL delegate to
`CreateOrderHandler` and return `ok(orderId)` on success or `err(appError)` on failure.

#### Scenario: Returns ok on valid input
- **WHEN** `appService.registerOrder({ customerId: 'C1', amount: 50, currency: 'USD' })` is called
- **THEN** it returns `{ ok: true, value: <orderId> }`

#### Scenario: Returns err on domain error
- **WHEN** `appService.registerOrder({ customerId: 'C1', amount: -1, currency: 'USD' })` is called
- **THEN** it returns `{ ok: false, error: <InvalidMoneyError> }`

---

### Requirement: composeOrders composition root
The system SHALL provide `composeOrders(env)` in `core/orders/src/index.ts` that constructs
all adapters and handlers and returns a wired `OrderAppService`. It SHALL select adapters by
env flags: `USE_AWS_DYNAMO` for DynamoDB vs in-memory repositories; `USE_AWS_SQS` for SQS vs
in-memory publisher. In Feature 1 only the in-memory adapters are implemented.

#### Scenario: Returns a working OrderAppService without env flags
- **WHEN** `composeOrders({})` is called (no flags set)
- **THEN** it returns an `OrderAppService` whose `registerOrder` call succeeds end-to-end

---

### Requirement: POST /orders HTTP endpoint
The system SHALL expose `POST /orders` in `apps/orders-api`. The endpoint SHALL:
- Require a valid Bearer JWT in the `Authorization` header (reject with 401 if absent or invalid).
- Validate the request body with `CreateOrderSchema` (reject with 422 on invalid input).
- Delegate to `OrderAppService.registerOrder()`.
- Return `201 Created` with `{ id, status: 'PENDING' }` on success.
- Return `409 Conflict` if `InvalidStateTransitionError` is thrown (should not occur in F1, but
  the mapping SHALL be present for correctness).
- Return `422 Unprocessable Entity` on domain validation errors (e.g. `InvalidMoneyError`).

#### Scenario: Valid request returns 201
- **WHEN** `POST /orders` is called with valid headers and body `{ customerId, amount, currency }`
- **THEN** the response is `201` with body `{ id: <string>, status: 'PENDING' }`

#### Scenario: Missing JWT returns 401
- **WHEN** `POST /orders` is called without an `Authorization` header
- **THEN** the response is `401 Unauthorized`

#### Scenario: Invalid body returns 422
- **WHEN** `POST /orders` is called with `{ amount: -1 }`
- **THEN** the response is `422 Unprocessable Entity`

---

### Requirement: GET /health endpoint
The system SHALL expose `GET /health` in `apps/orders-api` that returns `200 OK` with
`{ status: 'ok' }`. This endpoint SHALL NOT require authentication.

#### Scenario: Health check returns 200
- **WHEN** `GET /health` is called
- **THEN** the response is `200` with body `{ status: 'ok' }`
