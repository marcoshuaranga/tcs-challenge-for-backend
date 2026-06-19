## Why

Feature 1 (Registrar orden end-to-end) cannot be built without shared cross-cutting primitives:
error types, a Result monad, port interfaces for id/clock, and the Zod schemas that define the
API contract. These elements are needed by every subsequent feature; building them first prevents
duplication and circular dependencies across layers. We apply YAGNI — only the subset required by
Feature 1 is included.

## What Changes

- **New**: `core/kernel` — `Result<T,E>` discriminated union, `AppError` base class,
  `OrderNotFoundError`, `InvalidStateTransitionError`, `IdGeneratorPort` + `UuidGenerator`,
  `ClockPort` + `SystemClock`.
- **New**: `core/contracts` — `CreateOrderSchema` (Zod), `OrderResponseSchema` (Zod), inferred
  TypeScript types `CreateOrderDto` and `OrderResponseDto`.
- No modifications to existing files beyond adding index exports to the two lib packages.

## Capabilities

### New Capabilities

- `kernel-types`: Shared error hierarchy, Result type, and port interfaces for infrastructure
  concerns (id generation, clock). Pure TypeScript — no framework imports. Used by all core layers.
- `order-contracts`: Zod schemas and inferred DTOs for the order resource (create input +
  response). Single source of truth consumed by the API, worker, and future api-docs.

### Modified Capabilities

<!-- none — no existing specs to modify -->

## Impact

- `core/kernel` and `core/contracts` are pnpm workspace packages. This change populates their `src/` directories.
- All subsequent feature changes (`feature-1-register-order`, etc.) will import from these libs.
- No app code, no framework dependencies, no DynamoDB or SQS in scope.
- Hexagonal layer ordering (`domain ← application ← infrastructure`) is enforced by code discipline and review; kernel and contracts may be imported by all layers.
