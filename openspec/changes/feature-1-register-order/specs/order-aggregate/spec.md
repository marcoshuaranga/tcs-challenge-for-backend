## ADDED Requirements

### Requirement: OrderId value object
The system SHALL provide an `OrderId` value object that wraps a UUID string.
`OrderId.generate(id: IdGeneratorPort)` SHALL create a new unique identifier.
`OrderId.from(value: string)` SHALL wrap an existing string (for rehydration from storage).

#### Scenario: generate() produces a non-empty string
- **WHEN** `OrderId.generate(idGenerator)` is called
- **THEN** it returns an `OrderId` whose `.value` is a non-empty string

#### Scenario: from() wraps an existing string
- **WHEN** `OrderId.from('abc-123')` is called
- **THEN** it returns an `OrderId` whose `.value` equals `'abc-123'`

---

### Requirement: Money value object
The system SHALL provide a `Money` value object that holds `amount: number` and
`currency: string`. `Money.create(amount, currency)` SHALL reject non-positive amounts and
currencies that do not match the ISO 4217 structural pattern (`/^[A-Z]{3}$/`), throwing an
`InvalidMoneyError` with `code === 'INVALID_MONEY'`.

#### Scenario: Valid money is accepted
- **WHEN** `Money.create(100, 'USD')` is called
- **THEN** it returns a `Money` with `amount === 100` and `currency === 'USD'`

#### Scenario: Zero amount is rejected
- **WHEN** `Money.create(0, 'USD')` is called
- **THEN** it throws `InvalidMoneyError` with `code === 'INVALID_MONEY'`

#### Scenario: Negative amount is rejected
- **WHEN** `Money.create(-1, 'USD')` is called
- **THEN** it throws `InvalidMoneyError` with `code === 'INVALID_MONEY'`

#### Scenario: Invalid currency is rejected
- **WHEN** `Money.create(100, 'us')` is called
- **THEN** it throws `InvalidMoneyError` with `code === 'INVALID_MONEY'`

---

### Requirement: Order aggregate creation in PENDING state
The system SHALL provide an `Order` aggregate. `Order.create(props)` SHALL produce an order in
`PENDING` status with `id`, `customerId`, `money`, `createdAt`, and `updatedAt` fields set.
`createdAt` and `updatedAt` SHALL both be set to the timestamp provided by `ClockPort.now()`.

#### Scenario: Order is created with correct fields
- **WHEN** `Order.create({ id, customerId: 'C1', money: Money.create(50, 'USD'), clock })` is called
- **THEN** the returned order has `status === 'PENDING'`, `id === id.value`, `customerId === 'C1'`,
  `money.amount === 50`, `money.currency === 'USD'`, and `createdAt` equal to `updatedAt`

#### Scenario: Status is PENDING after creation
- **WHEN** `Order.create(...)` is called with valid props
- **THEN** `order.status === 'PENDING'`

---

### Requirement: AuditEntry type
The system SHALL provide an `AuditEntry` plain type (not a class) with fields:
`orderId: string`, `event: string`, `previousState: string | null`, `newState: string`,
`timestamp: Date`, `reason?: string`.

The `ORDER_CREATED` event SHALL use `previousState: null` and `newState: 'PENDING'`.

#### Scenario: AuditEntry for order creation
- **WHEN** an `AuditEntry` is constructed for `ORDER_CREATED`
- **THEN** `previousState` is `null`, `newState` is `'PENDING'`, and `event` is `'ORDER_CREATED'`
