## 1. core/orders package setup

- [x] 1.1 Add `test` and `typecheck` scripts to `core/orders/package.json`; update `core/orders/tsconfig.json` to include `test/**/*.ts`
- [x] 1.2 Add `@tcs-challenge-for-backend/kernel` and `@tcs-challenge-for-backend/contracts` as workspace dependencies in `core/orders/package.json`

## 2. Domain — value objects (TDD)

- [x] 2.1 Write failing tests in `core/orders/test/domain/order-id.test.ts`: `generate()` returns non-empty string; `from()` wraps existing value
- [x] 2.2 Write failing tests in `core/orders/test/domain/money.test.ts`: valid money accepted; zero rejected; negative rejected; invalid currency rejected; each throws `InvalidMoneyError` with `code === 'INVALID_MONEY'`
- [x] 2.3 Implement `InvalidMoneyError extends AppError` in `core/orders/src/domain/errors.ts`
- [x] 2.4 Implement `OrderId` in `core/orders/src/domain/order-id.ts`
- [x] 2.5 Implement `Money` in `core/orders/src/domain/money.ts`
- [x] 2.6 Verify value object tests pass (green)

## 3. Domain — Order aggregate + AuditEntry (TDD)

- [x] 3.1 Write failing tests in `core/orders/test/domain/order.test.ts`: `Order.create()` sets `status === 'PENDING'`, sets all required fields, `createdAt === updatedAt`
- [x] 3.2 Write failing test in `core/orders/test/domain/audit-entry.test.ts`: `AuditEntry` for ORDER_CREATED has `previousState === null` and `newState === 'PENDING'`
- [x] 3.3 Implement `AuditEntry` plain type in `core/orders/src/domain/audit-entry.ts`
- [x] 3.4 Implement `Order` aggregate in `core/orders/src/domain/order.ts` with `Order.create()` factory
- [x] 3.5 Export domain types from `core/orders/src/domain/index.ts`
- [x] 3.6 Verify domain tests pass (green)

## 4. Application — ports

- [x] 4.1 Declare `OrderRepositoryPort` (`save`, `findById`) in `core/orders/src/application/ports.ts`
- [x] 4.2 Declare `AuditRepositoryPort` (`append`) in the same file
- [x] 4.3 Declare `MessagePublisherPort` (`publishProcessOrder`) in the same file
- [x] 4.4 Export from `core/orders/src/application/index.ts`

## 5. Application — RecordAuditEntryHandler (TDD)

- [x] 5.1 Write failing test in `core/orders/test/application/record-audit-entry-handler.test.ts`: `execute(entry)` appends to audit repository
- [x] 5.2 Implement `RecordAuditEntryHandler` in `core/orders/src/application/record-audit-entry-handler.ts`
- [x] 5.3 Verify test passes (green)

## 6. Application — CreateOrderHandler (TDD)

- [x] 6.1 Write failing tests in `core/orders/test/application/create-order-handler.test.ts`:
      — returns non-empty orderId string;
      — order is saved in repository after execute;
      — audit entry with `ORDER_CREATED` is recorded;
      — `publishProcessOrder` called once with the new orderId;
      — invalid money (amount=0) throws `InvalidMoneyError` before any save
- [x] 6.2 Implement `CreateOrderHandler` in `core/orders/src/application/create-order-handler.ts`
- [x] 6.3 Verify all CreateOrderHandler tests pass (green)

## 7. Application — OrderAppService (TDD)

- [x] 7.1 Write failing tests in `core/orders/test/application/order-app-service.test.ts`:
      — `registerOrder` returns `ok(orderId)` on valid input;
      — `registerOrder` returns `err(InvalidMoneyError)` on invalid amount
- [x] 7.2 Implement `OrderAppService` in `core/orders/src/application/order-app-service.ts`
- [x] 7.3 Verify OrderAppService tests pass (green)

## 8. Infrastructure — in-memory adapters (TDD)

- [x] 8.1 Write failing tests in `core/orders/test/infrastructure/in-memory-adapters.test.ts`:
      — `InMemoryOrderRepository` satisfies `OrderRepositoryPort`; `save` + `findById` round-trip works; `findById` returns null for unknown id;
      — `InMemoryAuditRepository` satisfies `AuditRepositoryPort`; `append` stores entry;
      — `InMemoryMessagePublisher` satisfies `MessagePublisherPort`; records published orderIds
- [x] 8.2 Implement `InMemoryOrderRepository` in `core/orders/src/infrastructure/in-memory-order-repository.ts`
- [x] 8.3 Implement `InMemoryAuditRepository` in `core/orders/src/infrastructure/in-memory-audit-repository.ts`
- [x] 8.4 Implement `InMemoryMessagePublisher` in `core/orders/src/infrastructure/in-memory-message-publisher.ts`
- [x] 8.5 Export adapters from `core/orders/src/infrastructure/index.ts`
- [x] 8.6 Verify adapter tests pass (green)

## 9. Composition root — composeOrders (TDD)

- [x] 9.1 Write failing test in `core/orders/test/index.test.ts`: `composeOrders({})` returns an `OrderAppService`; calling `registerOrder` with valid input returns `ok(orderId)`
- [x] 9.2 Implement `composeOrders(env)` in `core/orders/src/index.ts`; wire `UuidGenerator`, `SystemClock`, all in-memory adapters, and handlers; `USE_AWS_DYNAMO`/`USE_AWS_SQS` guard throws `Error('not implemented')` if set
- [x] 9.3 Verify composeOrders test passes (green)
- [x] 9.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` — fix all violations

## 10. core/orders commits

- [x] 10.1 Commit: `feat(domain): Order aggregate, OrderId, Money value objects, AuditEntry`
- [x] 10.2 Commit: `feat(application): CreateOrderHandler, RecordAuditEntryHandler, OrderAppService`
- [x] 10.3 Commit: `feat(infra): in-memory adapters + composeOrders`

## 11. apps/orders-api — package setup

- [x] 11.1 Create `apps/orders-api/package.json` with name `@tcs-challenge-for-backend/orders-api`; add `hono`, `@hono/node-server` as runtime deps; add `@tcs-challenge-for-backend/orders` and `@tcs-challenge-for-backend/contracts` as workspace deps
- [x] 11.2 Create `apps/orders-api/tsconfig.json` extending `../../tsconfig.node.json`
- [x] 11.3 Add `dev`, `start`, `typecheck` scripts to `apps/orders-api/package.json`

## 12. apps/orders-api — routes (TDD)

- [x] 12.1 Write failing tests in `apps/orders-api/test/routes.test.ts` using `app.request()`:
      — `GET /health` returns 200 with `{ status: 'ok' }`;
      — `POST /orders` without Bearer token returns 401;
      — `POST /orders` with valid JWT + body `{ customerId, amount, currency }` returns 201 with `{ id, status: 'PENDING' }`;
      — `POST /orders` with valid JWT + invalid body `{ amount: -1 }` returns 422
- [x] 12.2 Implement JWT bearer middleware in `apps/orders-api/src/middleware/auth.ts` (verify HS256, `JWT_SECRET` from env, return 401 on failure)
- [x] 12.3 Implement `GET /health` route
- [x] 12.4 Implement `POST /orders` route: validate with `CreateOrderSchema` via `@hono/standard-validator`, delegate to `OrderAppService.registerOrder`, map `ok` → 201, `err(InvalidMoneyError)` → 422, `err(InvalidStateTransitionError)` → 409
- [x] 12.5 Wire Hono app in `apps/orders-api/src/app.ts`; export for testing and for Lambda/node-server entry points
- [x] 12.6 Create `apps/orders-api/src/index.ts` entry point using `@hono/node-server`
- [x] 12.7 Verify all route tests pass (green)

## 13. Quality gate

- [x] 13.1 Run `pnpm run lint` across workspace — zero errors
- [x] 13.2 Run `pnpm dlx prettier --write .` — fix formatting
- [x] 13.3 Commit: `feat(api): POST /orders with JWT auth, GET /health`
- [x] 13.4 Run `pnpm run typecheck` — zero TypeScript errors
- [x] 13.5 Run `pnpm run test` — all tests green
- [x] 13.6 Run `/code-review` on the full change
- [ ] 13.7 Archive this change with `/opsx:archive`
