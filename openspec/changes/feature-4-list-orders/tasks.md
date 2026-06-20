## 1. Infrastructure — OrderRepositoryPort.listAll + InMemoryOrderRepository (TDD)

- [x] 1.1 Add `listAll(): Promise<Order[]>` to `OrderRepositoryPort`
      in `core/orders/src/application/ports.ts`; export from `core/orders/src/application/index.ts`
- [x] 1.2 Write failing tests in `core/orders/test/infrastructure/in-memory-adapters.test.ts`
      (extend existing file):
      — `listAll` returns all saved orders when multiple orders exist;
      — `listAll` returns an empty array when the repository is empty
- [x] 1.3 Implement `listAll` on `InMemoryOrderRepository` in
      `core/orders/src/infrastructure/in-memory-order-repository.ts`
- [x] 1.4 Verify adapter tests pass (green)
- [x] 1.5 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 1.6 Commit: `feat(application+infra): extend OrderRepositoryPort + InMemoryOrderRepository.listAll`

## 2. Application — ListOrdersHandler (TDD)

- [x] 2.1 Write failing tests in `core/orders/test/application/list-orders-handler.test.ts`:
      — `handler.execute()` returns all orders when orders exist in the repository;
      — `handler.execute()` returns an empty array when the repository is empty;
      — has no side effects (no saves, no audit writes, no messages published)
- [x] 2.2 Implement `ListOrdersHandler` in
      `core/orders/src/application/list-orders-handler.ts`
- [x] 2.3 Verify ListOrdersHandler tests pass (green)

## 3. Application — OrderAppService.listOrders (TDD)

- [x] 3.1 Write failing tests in `core/orders/test/application/order-app-service.test.ts`
      (extend existing file):
      — `listOrders()` returns `ok([...orders])` when orders exist;
      — `listOrders()` returns `ok([])` when the repository is empty
- [x] 3.2 Add `listOrders(): Promise<Result<Order[], AppError>>` to `OrderAppService`
      in `core/orders/src/application/order-app-service.ts`
- [x] 3.3 Verify OrderAppService tests pass (green)
- [x] 3.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 3.5 Commit: `feat(application): ListOrdersHandler + OrderAppService.listOrders facade`

## 4. Composition root — extend composeOrders (TDD)

- [x] 4.1 Write failing tests in `core/orders/test/index.test.ts` (extend existing file):
      — `composeOrders({}).listOrders()` returns `ok([])` on an empty store
- [x] 4.2 Extend `composeOrders(env)` in `core/orders/src/index.ts` to wire
      `ListOrdersHandler`; pass it to `OrderAppService`
- [x] 4.3 Verify composition root tests pass (green)
- [x] 4.4 Run `pnpm run lint` and `pnpm dlx prettier --write .`
- [x] 4.5 Commit: `feat(infra): composeOrders wires ListOrdersHandler`

## 5. apps/orders-api — GET /orders route (TDD)

- [x] 5.1 Write failing tests in `apps/orders-api/test/routes.test.ts` (extend existing file):
      — `GET /orders` without JWT → 401;
      — `GET /orders` with valid JWT and empty store → 200 with body `[]`;
      — `GET /orders` with valid JWT and existing orders → 200 with array of `OrderResponseDto`
- [x] 5.2 Implement `GET /orders` route in `apps/orders-api/src/app.ts`:
      call `appService.listOrders()`, map `ok(orders)` → 200 with each order
      serialised as `OrderResponseDto`
- [x] 5.3 Verify route tests pass (green)
- [x] 5.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/orders-api`
- [x] 5.5 Commit: `feat(api): GET /orders`

## 6. Quality gate

- [x] 6.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [x] 6.2 Run `pnpm run test` across workspace — all tests green
- [x] 6.3 Run `/code-review` on the full change
- [ ] 6.4 Archive this change with `/opsx:archive`
