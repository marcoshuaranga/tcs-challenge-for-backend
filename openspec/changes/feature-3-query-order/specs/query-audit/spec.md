## ADDED Requirements

### Requirement: AuditRepositoryPort.findByOrderId
The system SHALL extend `AuditRepositoryPort` with a method
`findByOrderId(orderId: string): Promise<AuditEntry[]>` that returns all audit entries
for the given order in insertion order (earliest first).
It SHALL return an empty array if the order exists but has no entries (not an error).

#### Scenario: InMemoryAuditRepository returns entries for a known order
- **WHEN** audit entries have been appended for an orderId and `findByOrderId(orderId)` is called
- **THEN** it returns all entries in the order they were appended

#### Scenario: InMemoryAuditRepository returns empty array for order with no entries
- **WHEN** `findByOrderId(orderId)` is called for an orderId with no appended entries
- **THEN** it returns an empty array

---

### Requirement: GetOrderAuditHandler
The system SHALL provide a `GetOrderAuditHandler` query handler that, given an `orderId: string`:
1. Verifies the order exists via `OrderRepositoryPort.findById`; throws `OrderNotFoundError` if not.
2. Returns all audit entries for that order via `AuditRepositoryPort.findByOrderId`.
It SHALL have no side effects.

#### Scenario: Returns audit entries for a known order
- **WHEN** `handler.execute({ orderId })` is called and the order exists with audit entries
- **THEN** it returns an array of `AuditEntry` objects in insertion order

#### Scenario: Returns empty array for order with no audit entries
- **WHEN** `handler.execute({ orderId })` is called and the order exists but has no audit entries
- **THEN** it returns an empty array

#### Scenario: Throws OrderNotFoundError for a non-existent order
- **WHEN** `handler.execute({ orderId })` is called and the order does not exist
- **THEN** it throws `OrderNotFoundError` with `code === 'ORDER_NOT_FOUND'`

---

### Requirement: OrderAppService.getOrderAudit
The system SHALL expose
`OrderAppService.getOrderAudit(orderId: string): Promise<Result<AuditEntry[], AppError>>`
that delegates to `GetOrderAuditHandler` and returns `ok(entries)` on success or
`err(OrderNotFoundError)` when the order does not exist.

#### Scenario: Returns ok with entries for a known order
- **WHEN** `appService.getOrderAudit(orderId)` is called and the order exists
- **THEN** it returns `{ ok: true, value: <AuditEntry[]> }`

#### Scenario: Returns err for a non-existent order
- **WHEN** `appService.getOrderAudit('nonexistent-id')` is called
- **THEN** it returns `{ ok: false, error: <OrderNotFoundError> }`

---

### Requirement: GET /orders/:id/audit HTTP endpoint
The system SHALL expose `GET /orders/:id/audit` in `apps/orders-api`. The endpoint SHALL:
- Require a valid Bearer JWT (401 if absent or invalid).
- Return `200 OK` with a JSON array of audit entries on success.
- Return `404 Not Found` with the standard error envelope if the order does not exist.
Each entry in the array SHALL include: `orderId`, `event`, `previousState`, `newState`,
`timestamp` (ISO 8601 string), and `reason` (if present).

#### Scenario: Valid request returns 200 with audit trail
- **WHEN** `GET /orders/:id/audit` is called with a valid JWT and the order exists
- **THEN** the response is `200` with a JSON array of audit entries

#### Scenario: Returns 200 with empty array for order with no audit entries
- **WHEN** `GET /orders/:id/audit` is called for an existing order with no audit entries
- **THEN** the response is `200` with body `[]`

#### Scenario: Missing JWT returns 401
- **WHEN** `GET /orders/:id/audit` is called without an Authorization header
- **THEN** the response is `401 Unauthorized`

#### Scenario: Unknown order returns 404
- **WHEN** `GET /orders/:id/audit` is called with a valid JWT and the order does not exist
- **THEN** the response is `404` with body `{ error: { code: 'ORDER_NOT_FOUND', message: <string> } }`
