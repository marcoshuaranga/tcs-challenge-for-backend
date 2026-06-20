## ADDED Requirements

### Requirement: Order.startProcessing() transition

The system SHALL provide `Order.startProcessing()` on the `Order` aggregate. It SHALL transition
the order from `PENDING` to `PROCESSING`, updating `updatedAt` to the current clock time.
It SHALL throw `InvalidStateTransitionError` if the order is not in `PENDING` state.

#### Scenario: PENDING order transitions to PROCESSING

- **WHEN** `order.startProcessing(clock)` is called on an order in `PENDING` state
- **THEN** `order.status` becomes `'PROCESSING'` and `order.updatedAt` is updated

#### Scenario: Non-PENDING order throws on startProcessing

- **WHEN** `order.startProcessing(clock)` is called on an order already in `PROCESSING` state
- **THEN** it throws `InvalidStateTransitionError` with `code === 'INVALID_STATE_TRANSITION'`

---

### Requirement: Order.complete() transition

The system SHALL provide `Order.complete()` on the `Order` aggregate. It SHALL transition the
order from `PROCESSING` to `COMPLETED`, updating `updatedAt`.
It SHALL throw `InvalidStateTransitionError` if the order is not in `PROCESSING` state.

#### Scenario: PROCESSING order transitions to COMPLETED

- **WHEN** `order.complete(clock)` is called on an order in `PROCESSING` state
- **THEN** `order.status` becomes `'COMPLETED'` and `order.updatedAt` is updated

#### Scenario: Non-PROCESSING order throws on complete

- **WHEN** `order.complete(clock)` is called on an order in `PENDING` state
- **THEN** it throws `InvalidStateTransitionError` with `code === 'INVALID_STATE_TRANSITION'`

---

### Requirement: Order.fail() transition

The system SHALL provide `Order.fail(reason: string)` on the `Order` aggregate. It SHALL
transition the order from `PROCESSING` to `FAILED`, storing the `reason` and updating
`updatedAt`. It SHALL throw `InvalidStateTransitionError` if the order is not in `PROCESSING`
state.

#### Scenario: PROCESSING order transitions to FAILED

- **WHEN** `order.fail('payment_declined', clock)` is called on an order in `PROCESSING` state
- **THEN** `order.status` becomes `'FAILED'` and `order.failureReason` equals `'payment_declined'`

#### Scenario: Non-PROCESSING order throws on fail

- **WHEN** `order.fail('payment_declined', clock)` is called on an order in `PENDING` state
- **THEN** it throws `InvalidStateTransitionError` with `code === 'INVALID_STATE_TRANSITION'`

---

### Requirement: Terminal states are immutable

`COMPLETED` and `FAILED` are terminal states. The system SHALL throw `InvalidStateTransitionError`
for any transition attempt from a terminal state.

#### Scenario: COMPLETED order rejects further transitions

- **WHEN** `order.startProcessing(clock)` is called on an order in `COMPLETED` state
- **THEN** it throws `InvalidStateTransitionError`

#### Scenario: FAILED order rejects further transitions

- **WHEN** `order.startProcessing(clock)` is called on an order in `FAILED` state
- **THEN** it throws `InvalidStateTransitionError`
