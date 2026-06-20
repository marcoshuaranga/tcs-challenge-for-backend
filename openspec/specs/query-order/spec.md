## Purpose

Defines the requirements for querying a single order by id — the application-layer handler, the service façade, and the HTTP endpoint.

## Requirements

### Requirement: GetOrderHandler
The system SHALL provide a `GetOrderHandler` query handler that, given an `orderId: string`,
loads the order via `OrderRepositoryPort.findById` and returns it.
It SHALL throw `OrderNotFoundError` if no order exists with that id.
It SHALL have no side effects (no saves, no audit writes, no messages published).

#### Scenario: Returns the order for a known id
- **WHEN** `handler.execute({ orderId })` is called and the order exists
- **THEN** it returns the `Order` object with all its fields

#### Scenario: Throws OrderNotFoundError for an unknown id
- **WHEN** `handler.execute({ orderId })` is called and no order exists with that id
- **THEN** it throws `OrderNotFoundError` with `code === 'ORDER_NOT_FOUND'`

---

### Requirement: OrderAppService.getOrder
The system SHALL expose `OrderAppService.getOrder(orderId: string): Promise<Result<Order, AppError>>`
that delegates to `GetOrderHandler` and returns `ok(order)` on success or
`err(OrderNotFoundError)` when the order does not exist.

#### Scenario: Returns ok with the order on success
- **WHEN** `appService.getOrder(orderId)` is called and the order exists
- **THEN** it returns `{ ok: true, value: <Order> }`

#### Scenario: Returns err on missing order
- **WHEN** `appService.getOrder('nonexistent-id')` is called
- **THEN** it returns `{ ok: false, error: <OrderNotFoundError> }`

---

### Requirement: GET /orders/:id HTTP endpoint
The system SHALL expose `GET /orders/:id` in `apps/orders-api`. The endpoint SHALL:
- Require a valid Bearer JWT (401 if absent or invalid).
- Return `200 OK` with the order serialised as `OrderResponseDto` on success.
- Return `404 Not Found` with the standard error envelope `{ error: { code, message } }`
  if the order does not exist.

#### Scenario: Valid request returns 200 with order data
- **WHEN** `GET /orders/:id` is called with a valid JWT and the order exists
- **THEN** the response is `200` with body matching `OrderResponseDto`
  (`{ id, status, customerId, amount, currency, createdAt, updatedAt }`)

#### Scenario: Missing JWT returns 401
- **WHEN** `GET /orders/:id` is called without an Authorization header
- **THEN** the response is `401 Unauthorized`

#### Scenario: Unknown order returns 404
- **WHEN** `GET /orders/:id` is called with a valid JWT and the order does not exist
- **THEN** the response is `404` with body `{ error: { code: 'ORDER_NOT_FOUND', message: <string> } }`
