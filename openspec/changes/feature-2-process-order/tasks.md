## 1. Domain — state machine transitions (TDD)

- [ ] 1.1 Write failing tests in `core/orders/test/domain/order.test.ts` (extend existing file):
      — `startProcessing()` on PENDING → status becomes PROCESSING, updatedAt updated;
      — `startProcessing()` on non-PENDING → throws InvalidStateTransitionError;
      — `complete()` on PROCESSING → status becomes COMPLETED;
      — `complete()` on non-PROCESSING → throws InvalidStateTransitionError;
      — `fail('payment_declined')` on PROCESSING → status becomes FAILED, failureReason set;
      — `fail(...)` on non-PROCESSING → throws InvalidStateTransitionError;
      — `startProcessing()` on COMPLETED → throws InvalidStateTransitionError;
      — `startProcessing()` on FAILED → throws InvalidStateTransitionError
- [ ] 1.2 Implement `Order.startProcessing(clock: ClockPort)`, `Order.complete(clock)`,
      `Order.fail(reason: string, clock: ClockPort)` in `core/orders/src/domain/order.ts`
- [ ] 1.3 Verify all state machine tests pass (green)

## 2. Application — PaymentGatewayPort

- [ ] 2.1 Add `PaymentGatewayPort` interface to `core/orders/src/application/ports.ts`:
      `authorize(order: Order): Promise<{ approved: boolean }>`
- [ ] 2.2 Export `PaymentGatewayPort` from `core/orders/src/application/index.ts`

## 3. Infrastructure — FakePaymentGateway + InMemoryMessagePublisher.drain (TDD)

- [ ] 3.1 Write failing tests in `core/orders/test/infrastructure/fake-payment-gateway.test.ts`:
      — amount ≤ FAIL_ABOVE_AMOUNT → `{ approved: true }`;
      — amount > FAIL_ABOVE_AMOUNT → `{ approved: false }`
- [ ] 3.2 Implement `FakePaymentGateway` in
      `core/orders/src/infrastructure/fake-payment-gateway.ts`; constructor accepts
      `failAboveAmount: number`
- [ ] 3.3 Export `FakePaymentGateway` from `core/orders/src/infrastructure/index.ts`
- [ ] 3.4 Verify FakePaymentGateway tests pass (green)
- [ ] 3.5 Write failing test in `core/orders/test/infrastructure/in-memory-adapters.test.ts`
      (extend existing file): `drain()` returns all published orderIds and clears the queue;
      second call to `drain()` returns empty array
- [ ] 3.6 Implement `drain(): string[]` on `InMemoryMessagePublisher`
- [ ] 3.7 Verify drain test passes (green)

## 4. Infrastructure — commit

- [ ] 4.1 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders` — fix all violations
- [ ] 4.2 Commit: `feat(infra): FakePaymentGateway, InMemoryMessagePublisher.drain`

## 5. Application — ProcessOrderHandler (TDD)

- [ ] 5.1 Write failing tests in `core/orders/test/application/process-order-handler.test.ts`:
      — happy path: gateway approves → order COMPLETED, 2 audit entries (ORDER_PROCESSING_STARTED, ORDER_COMPLETED), order saved twice;
      — declined path: gateway declines → order FAILED with reason 'payment_declined', 2 audit entries (ORDER_PROCESSING_STARTED, ORDER_FAILED);
      — idempotent PROCESSING: handler returns, no save, no audit, no gateway call;
      — idempotent COMPLETED: same no-op behaviour;
      — not found: missing orderId → throws OrderNotFoundError
- [ ] 5.2 Implement `ProcessOrderHandler` in
      `core/orders/src/application/process-order-handler.ts`
- [ ] 5.3 Verify all ProcessOrderHandler tests pass (green)

## 6. Application — OrderAppService.processOrder (TDD)

- [ ] 6.1 Write failing tests in `core/orders/test/application/order-app-service.test.ts`
      (extend existing file):
      — `processOrder(orderId)` returns `ok(undefined)` for valid PENDING order;
      — `processOrder('nonexistent')` returns `err(OrderNotFoundError)`
- [ ] 6.2 Add `processOrder(orderId: string): Promise<Result<void, AppError>>` to
      `OrderAppService` in `core/orders/src/application/order-app-service.ts`
- [ ] 6.3 Verify OrderAppService tests pass (green)

## 7. Application — commit

- [ ] 7.1 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders` — fix all violations
- [ ] 7.2 Commit: `feat(application): ProcessOrderHandler, PaymentGatewayPort, processOrder facade`

## 8. Composition root — extend composeOrders (TDD)

- [ ] 8.1 Write failing test in `core/orders/test/index.test.ts` (extend existing file):
      `composeOrders({}).processOrder('nonexistent')` returns `err(OrderNotFoundError)`
- [ ] 8.2 Extend `composeOrders(env)` in `core/orders/src/index.ts` to wire
      `FakePaymentGateway` (reads `FAIL_ABOVE_AMOUNT` from env, defaults to `Infinity`)
      and `ProcessOrderHandler`; pass both to `OrderAppService`
- [ ] 8.3 Verify composition root test passes (green)

## 9. Domain commit

- [ ] 9.1 Run `pnpm run lint` and `pnpm dlx prettier --write .` — fix all violations
- [ ] 9.2 Commit: `feat(domain): state machine transitions — startProcessing, complete, fail`
- [ ] 9.3 Commit: `feat(application): composeOrders extended with ProcessOrderHandler + FakePaymentGateway`

## 10. apps/orders-api — POST /orders/:id/process route (TDD)

- [ ] 10.1 Write failing tests in `apps/orders-api/test/routes.test.ts` (extend existing file):
       — `POST /orders/:id/process` without JWT → 401;
       — `POST /orders/:id/process` with valid JWT and unknown id → 404 with error envelope;
       — `POST /orders/:id/process` with valid JWT and non-PENDING order → 409 with error envelope;
       — `POST /orders/:id/process` with valid JWT and PENDING order → 202 with `{ id, status }`
- [ ] 10.2 Implement `POST /orders/:id/process` route in `apps/orders-api/src/app.ts`:
       call `appService.processOrder(id)`, map `ok` → 202 with `{ id, status: 'PENDING' }`,
       map `err(OrderNotFoundError)` → 404, map `err(InvalidStateTransitionError)` → 409
- [ ] 10.3 Verify all route tests pass (green)
- [ ] 10.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/orders-api`
- [ ] 10.5 Commit: `feat(api): POST /orders/:id/process`

## 11. apps/orders-worker — package setup

- [ ] 11.1 Create `apps/orders-worker/package.json` with name
       `@tcs-challenge-for-backend/orders-worker`; add `@tcs-challenge-for-backend/orders`
       as workspace dep; add `dev`, `start`, `typecheck` scripts
- [ ] 11.2 Create `apps/orders-worker/tsconfig.json` extending `../../tsconfig.node.json`
- [ ] 11.3 Add `apps/orders-worker` to `pnpm-workspace.yaml` if not already present

## 12. apps/orders-worker — poll-loop (TDD)

- [ ] 12.1 Write failing tests in `apps/orders-worker/test/poll-loop.test.ts`:
       — one pending orderId in InMemoryMessagePublisher → poll-loop calls processOrder, order no longer PENDING;
       — empty queue → poll-loop iterates without calling processOrder
- [ ] 12.2 Implement `startPollLoop(appService, publisher): () => void` in
       `apps/orders-worker/src/poll-loop.ts`; drains `InMemoryMessagePublisher.drain()` and
       calls `appService.processOrder(orderId)` per id; returns a stop function
- [ ] 12.3 Verify poll-loop tests pass (green)

## 13. apps/orders-worker — Lambda SQS handler (TDD)

- [ ] 13.1 Write failing tests in `apps/orders-worker/test/lambda-handler.test.ts`:
       — valid SQSEvent with one record `{ orderId }` → `processOrder` called exactly once;
       — record body is not parseable as `{ orderId }` → error logged, remaining records processed (no crash)
- [ ] 13.2 Implement Lambda SQS handler in `apps/orders-worker/src/lambda-handler.ts`:
       parses each `SQSRecord.body` as `{ orderId: string }`, calls `appService.processOrder`,
       catches and logs errors per record without aborting the batch; exports `handler`
- [ ] 13.3 Verify Lambda handler tests pass (green)
- [ ] 13.4 Create `apps/orders-worker/src/index.ts` entry point for local dev:
       calls `composeOrders(env)` and `startPollLoop`

## 14. apps/orders-worker — commit

- [ ] 14.1 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/orders-worker`
- [ ] 14.2 Commit: `feat(worker): orders-worker — poll-loop + Lambda SQS handler`

## 15. Quality gate

- [ ] 15.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [ ] 15.2 Run `pnpm run test` across workspace — all tests green
- [ ] 15.3 Run `/code-review` on the full change
- [ ] 15.4 Archive this change with `/opsx:archive`
