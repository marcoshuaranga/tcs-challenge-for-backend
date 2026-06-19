# Spec: kernel-types

## Purpose

Shared foundational types for the `core/kernel` package: a `Result<T, E>` discriminated union for
explicit error handling across layer boundaries, a set of typed `AppError` subclasses for
domain/application errors, and ports (`IdGeneratorPort`, `ClockPort`) with concrete implementations
that keep domain code free of I/O coupling.

## Requirements

### Requirement: Result type for explicit error handling

The system SHALL provide a `Result<T, E>` discriminated union type and constructor helpers so
that callers can handle success and failure without relying on thrown exceptions across layer
boundaries. The discriminant field SHALL be named `ok`.

#### Scenario: Constructing a success value

- **WHEN** `ok(value)` is called with any value
- **THEN** it returns `{ ok: true, value }` narrowed to `Result<T, never>`

#### Scenario: Constructing a failure value

- **WHEN** `err(error)` is called with any error
- **THEN** it returns `{ ok: false, error }` narrowed to `Result<never, E>`

#### Scenario: Type narrowing on ok flag

- **WHEN** a `Result<T, E>` is checked with `if (result.ok)`
- **THEN** TypeScript SHALL narrow `result.value` to `T` in the truthy branch and `result.error` to `E` in the falsy branch

---

### Requirement: AppError base class

The system SHALL provide an `AppError` class that all domain and application errors extend. It
SHALL carry a machine-readable `code: string` and a human-readable `message: string`.

#### Scenario: Creating an AppError subclass

- **WHEN** a subclass sets `this.code` and calls `super(message)`
- **THEN** `error.code` and `error.message` are both accessible as strings

#### Scenario: AppError is instanceof Error

- **WHEN** an `AppError` instance is checked with `instanceof Error`
- **THEN** the result SHALL be `true`

---

### Requirement: OrderNotFoundError

The system SHALL provide `OrderNotFoundError extends AppError` with `code = 'ORDER_NOT_FOUND'`.
It SHALL accept an `orderId: string` and include it in the message.

#### Scenario: Error carries orderId in message

- **WHEN** `new OrderNotFoundError('abc-123')` is constructed
- **THEN** `error.code === 'ORDER_NOT_FOUND'` and `error.message` contains `'abc-123'`

---

### Requirement: InvalidStateTransitionError

The system SHALL provide `InvalidStateTransitionError extends AppError` with
`code = 'INVALID_STATE_TRANSITION'`. It SHALL accept `from: string` and `to: string` and
include both in the message.

#### Scenario: Error carries transition details

- **WHEN** `new InvalidStateTransitionError('COMPLETED', 'PENDING')` is constructed
- **THEN** `error.code === 'INVALID_STATE_TRANSITION'` and `error.message` contains both
  `'COMPLETED'` and `'PENDING'`

---

### Requirement: IdGeneratorPort interface

The system SHALL provide an `IdGeneratorPort` interface with a single method `generate(): string`
so that domain and application code can request unique identifiers without coupling to a concrete
implementation.

#### Scenario: Port is implemented by UuidGenerator

- **WHEN** `UuidGenerator` is assigned to a variable of type `IdGeneratorPort`
- **THEN** TypeScript SHALL accept the assignment without error

#### Scenario: UuidGenerator produces a valid UUID v4

- **WHEN** `new UuidGenerator().generate()` is called
- **THEN** it returns a string matching the UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`)

---

### Requirement: ClockPort interface

The system SHALL provide a `ClockPort` interface with a single method `now(): Date` so that
domain and application code can obtain the current time without coupling to `new Date()` directly,
enabling deterministic tests.

#### Scenario: Port is implemented by SystemClock

- **WHEN** `SystemClock` is assigned to a variable of type `ClockPort`
- **THEN** TypeScript SHALL accept the assignment without error

#### Scenario: SystemClock returns current time

- **WHEN** `new SystemClock().now()` is called
- **THEN** it returns a `Date` whose `getTime()` is within 1000ms of `Date.now()`
