## Context

The pnpm workspaces scaffold (Step 1) is complete. `core/kernel` and `core/contracts` exist as empty pnpm workspace packages. Both must remain pure TypeScript — no framework, no I/O.

Feature 1 (Registrar orden) needs: a typed error hierarchy, a Result monad to avoid exception
propagation across layer boundaries, infrastructure port interfaces for id/clock so domain and
application stay deterministic, and Zod schemas so the API and worker share a validated contract.

Methodology: XP. Each implementation task is preceded by its test (Red → Green → Refactor). YAGNI
enforced — only what Feature 1 strictly requires is included here.

## Goals / Non-Goals

**Goals:**
- `Result<T,E>` discriminated union with `ok()` / `err()` constructors and type-narrowing helpers.
- `AppError` base class; `OrderNotFoundError` and `InvalidStateTransitionError` concrete errors.
- `IdGeneratorPort` interface + `UuidGenerator` implementation (wraps `crypto.randomUUID`).
- `ClockPort` interface + `SystemClock` implementation (`new Date()`).
- `CreateOrderSchema` and `OrderResponseSchema` as Zod objects; inferred DTO types re-exported.
- All exports via barrel `index.ts` in each lib.

**Non-Goals:**
- `AuditEntry`, `ProcessOrderMessage`, `ListOrdersResponse` schemas (Feature 2/3 scope).
- `ErrorResponseSchema` or HTTP-level envelope types (API layer concern).
- Any DI container, decorator, or `reflect-metadata` usage.
- Domain logic (Order aggregate, state machine) — those belong to `core/orders/src/domain`.

## Decisions

### Result<T,E> as discriminated union, not thrown exceptions

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

Alternatives considered:
- **Throw everywhere**: simpler to write, but forces every caller to wrap in try/catch and loses
  type information on the error. Cross-layer exception contracts become implicit.
- **Option/Maybe**: only models absence, not failure reason. Not sufficient for `FAILED` with a
  reason string.

Decision: discriminated union. `ok` flag is a type-narrowing discriminant; no runtime overhead.
Helpers `ok(value)` and `err(error)` are the only constructors.

### AppError as a class, not an interface

Lets `instanceof` checks work at the HTTP boundary for error→HTTP code mapping without
registering a type-brand manually. Concrete subclasses add no extra fields — just fix the `code`.

### Ports as plain TypeScript interfaces (no abstract class)

Structural typing suffices. Abstract classes would force a `super()` call in every adapter and
add no compile-time safety beyond what an `implements` clause provides.

### Zod as schema definition language for contracts (ADR-0012)

Already decided. `CreateOrderSchema` is the canonical shape: validated at the API boundary via
`@hono/standard-validator`, typed via inference throughout the core. `currency` is validated as
a 3-uppercase-letter string (ISO 4217 structural check — no exhaustive enum to avoid maintenance
burden).

### TDD order (XP)

Every implementation task in `tasks.md` is preceded by a failing-test task. Tests use Vitest. No mocking framework needed for kernel/contracts — they are pure in-memory logic.

## Risks / Trade-offs

- **Result proliferation**: if handlers return `Result` and the app service also wraps in
  `Result`, callers must chain or unwrap twice. Mitigation: handlers throw domain errors; the
  app service catches and converts to `Result` at the facade boundary. One unwrap point.
- **Currency validation scope**: a 3-letter regex is not an exhaustive ISO 4217 check. Unknown
  currencies pass validation. Mitigation: acceptable for a demo; noted in contracts spec.

## Open Questions

None — decisions above are sufficient to implement without ambiguity.
