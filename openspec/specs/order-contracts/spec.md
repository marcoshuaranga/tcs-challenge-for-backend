# Spec: order-contracts

## Purpose

Zod schemas and inferred TypeScript types for the `core/contracts` package. These schemas are the
single source of truth for API input validation, OpenAPI generation (via `zod-to-openapi`), and
DTO types used across apps and the core orders package.

## Requirements

### Requirement: CreateOrderSchema

The system SHALL provide a Zod schema `CreateOrderSchema` that validates the input for
registering an order. A corresponding TypeScript type `CreateOrderDto` SHALL be inferred from
the schema and re-exported.

Fields:

- `customerId`: non-empty string (min length 1).
- `amount`: positive number (strictly greater than 0).
- `currency`: string of exactly 3 uppercase letters (structural ISO 4217 check).

#### Scenario: Valid create payload parses successfully

- **WHEN** `CreateOrderSchema.parse({ customerId: 'C1', amount: 100, currency: 'USD' })` is called
- **THEN** it returns the object without throwing

#### Scenario: Negative amount is rejected

- **WHEN** `CreateOrderSchema.parse({ customerId: 'C1', amount: -1, currency: 'USD' })` is called
- **THEN** Zod throws a `ZodError`

#### Scenario: Zero amount is rejected

- **WHEN** `CreateOrderSchema.parse({ customerId: 'C1', amount: 0, currency: 'USD' })` is called
- **THEN** Zod throws a `ZodError`

#### Scenario: Empty customerId is rejected

- **WHEN** `CreateOrderSchema.parse({ customerId: '', amount: 50, currency: 'USD' })` is called
- **THEN** Zod throws a `ZodError`

#### Scenario: Currency with wrong format is rejected

- **WHEN** `CreateOrderSchema.parse({ customerId: 'C1', amount: 50, currency: 'us' })` is called
- **THEN** Zod throws a `ZodError`

---

### Requirement: OrderResponseSchema

The system SHALL provide a Zod schema `OrderResponseSchema` that defines the shape of an order
resource returned by the API. A corresponding TypeScript type `OrderResponseDto` SHALL be
inferred and re-exported.

Fields:

- `id`: non-empty string.
- `status`: one of `'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'`.
- `customerId`: non-empty string.
- `amount`: positive number.
- `currency`: string of exactly 3 uppercase letters.
- `createdAt`: ISO 8601 datetime string.
- `updatedAt`: ISO 8601 datetime string.

#### Scenario: Valid order response parses successfully

- **WHEN** `OrderResponseSchema.parse` is called with a fully-populated valid object
- **THEN** it returns the object without throwing

#### Scenario: Invalid status is rejected

- **WHEN** `OrderResponseSchema.parse` is called with `status: 'UNKNOWN'`
- **THEN** Zod throws a `ZodError`

#### Scenario: Missing required field is rejected

- **WHEN** `OrderResponseSchema.parse` is called without `createdAt`
- **THEN** Zod throws a `ZodError`
