## Purpose

Specification for the list-orders capability: querying all orders through the repository port, application service, and HTTP layer.

## Requirements

### Requirement: OrderRepositoryPort.listAll
The system SHALL extend `OrderRepositoryPort` with a method
`listAll(): Promise<Order[]>` that returns all stored orders.
It SHALL return an empty array when no orders exist (not an error).

#### Scenario: Returns all orders when multiple orders exist
- **WHEN** multiple orders have been saved and `listAll()` is called
- **THEN** it returns an array containing all saved orders

#### Scenario: Returns empty array when no orders exist
- **WHEN** the repository is empty and `listAll()` is called
- **THEN** it returns an empty array `[]`

---

### Requirement: ListOrdersHandler
The system SHALL provide a `ListOrdersHandler` query handler that returns all orders
via `OrderRepositoryPort.listAll()`.
It SHALL have no side effects (no saves, no audit writes, no messages published).

#### Scenario: Returns all orders
- **WHEN** `handler.execute()` is called and orders exist in the repository
- **THEN** it returns an array of all `Order` objects

#### Scenario: Returns empty array when repository is empty
- **WHEN** `handler.execute()` is called and the repository is empty
- **THEN** it returns an empty array `[]`

---

### Requirement: OrderAppService.listOrders
The system SHALL expose
`OrderAppService.listOrders(): Promise<Result<Order[], AppError>>`
that delegates to `ListOrdersHandler`, returning `ok(orders)` on success
or `err(AppError)` if the repository throws.

#### Scenario: Returns ok with all orders
- **WHEN** `appService.listOrders()` is called and orders exist
- **THEN** it returns `{ ok: true, value: <Order[]> }`

#### Scenario: Returns ok with empty array when no orders exist
- **WHEN** `appService.listOrders()` is called and the repository is empty
- **THEN** it returns `{ ok: true, value: [] }`

---

### Requirement: GET /orders HTTP endpoint
The system SHALL expose `GET /orders` in `apps/orders-api`. The endpoint SHALL:
- Require a valid Bearer JWT (401 if absent or invalid).
- Return `200 OK` with a JSON array of orders serialised as `OrderResponseDto` on success.
- Return `200 OK` with body `[]` when no orders exist (never 204).

#### Scenario: Valid request returns 200 with array of orders
- **WHEN** `GET /orders` is called with a valid JWT and orders exist
- **THEN** the response is `200` with a JSON array where each element matches
  `OrderResponseDto` (`{ id, status, customerId, amount, currency, createdAt, updatedAt }`)

#### Scenario: Valid request returns 200 with empty array when no orders exist
- **WHEN** `GET /orders` is called with a valid JWT and no orders have been registered
- **THEN** the response is `200` with body `[]`

#### Scenario: Missing JWT returns 401
- **WHEN** `GET /orders` is called without an Authorization header
- **THEN** the response is `401 Unauthorized`
