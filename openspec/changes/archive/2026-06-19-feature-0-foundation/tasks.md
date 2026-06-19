## 1. core/kernel — Result type (TDD)

- [x] 1.1 Write failing tests: `ok(value)` returns `{ ok: true, value }` and `err(error)` returns `{ ok: false, error }`
- [x] 1.2 Write failing test: TypeScript narrows `value` / `error` when branching on `result.ok`
- [x] 1.3 Implement `Result<T,E>` discriminated union and `ok()` / `err()` constructor helpers in `core/kernel/src/result.ts`
- [x] 1.4 Verify Result tests pass (green)

## 2. core/kernel — AppError hierarchy (TDD)

- [x] 2.1 Write failing test: `AppError` is `instanceof Error`, exposes `code` and `message`
- [x] 2.2 Write failing test: `OrderNotFoundError` has `code === 'ORDER_NOT_FOUND'` and message contains the orderId
- [x] 2.3 Write failing test: `InvalidStateTransitionError` has `code === 'INVALID_STATE_TRANSITION'` and message contains `from` and `to`
- [x] 2.4 Implement `AppError` base class in `core/kernel/src/errors.ts`
- [x] 2.5 Implement `OrderNotFoundError extends AppError`
- [x] 2.6 Implement `InvalidStateTransitionError extends AppError`
- [x] 2.7 Verify AppError hierarchy tests pass (green)

## 3. core/kernel — Ports + implementations (TDD)

- [x] 3.1 Write failing test: `UuidGenerator.generate()` returns a string matching UUID v4 pattern
- [x] 3.2 Write failing test: `SystemClock.now()` returns a `Date` within 1000ms of `Date.now()`
- [x] 3.3 Declare `IdGeneratorPort` interface in `core/kernel/src/ports.ts`
- [x] 3.4 Implement `UuidGenerator` using `crypto.randomUUID`
- [x] 3.5 Declare `ClockPort` interface
- [x] 3.6 Implement `SystemClock`
- [x] 3.7 Verify port tests pass (green)
- [x] 3.8 Export everything via `core/kernel/src/index.ts` barrel

## 4. core/kernel — Commit

- [x] 4.1 Run `pnpm dlx eslint .` — fix any violations
- [x] 4.2 Run `pnpm dlx prettier --check .` — fix formatting
- [x] 4.3 Commit: `feat(kernel): Result type, AppError hierarchy, IdGenerator + Clock ports`


## 5. core/contracts — Zod schemas (TDD)

- [x] 5.1 Add `zod` to `core/contracts` (`pnpm add zod --filter @tcs-challenge-for-backend/contracts`)
- [x] 5.2 Write failing tests for `CreateOrderSchema`: valid payload parses; negative amount rejected; zero amount rejected; empty `customerId` rejected; wrong currency format rejected
- [x] 5.3 Implement `CreateOrderSchema` in `core/contracts/src/order.ts`; infer and export `CreateOrderDto`
- [x] 5.4 Verify CreateOrderSchema tests pass (green)
- [x] 5.5 Write failing tests for `OrderResponseSchema`: valid response parses; invalid status rejected; missing `createdAt` rejected
- [x] 5.6 Implement `OrderResponseSchema`; infer and export `OrderResponseDto`
- [x] 5.7 Verify OrderResponseSchema tests pass (green)
- [x] 5.8 Export everything via `core/contracts/src/index.ts` barrel

## 6. core/contracts — Commit

- [x] 6.1 Run `pnpm dlx eslint .` — fix any violations
- [x] 6.2 Run `pnpm dlx prettier --check .` — fix formatting
- [x] 6.3 Commit: `feat(contracts): CreateOrderSchema + OrderResponseSchema (Zod)`

## 7. Quality gate

- [x] 7.1 Run `pnpm dlx eslint .` across workspace — zero errors
- [x] 7.2 Run all tests (`pnpm -r run test`) — all green
- [x] 7.3 Run `/code-review` on the full change — verify alignment with CLAUDE.md invariants and spec scenarios
- [ ] 7.4 Archive this change with `/opsx:archive`
