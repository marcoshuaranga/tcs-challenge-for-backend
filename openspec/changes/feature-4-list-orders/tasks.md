## 1. Infrastructure — OrderRepositoryPort.listAll + InMemoryOrderRepository (TDD)

- [ ] 1.1 Add `listAll(): Promise<Order[]>` to `OrderRepositoryPort`
      in `core/orders/src/application/ports.ts`; export from `core/orders/src/application/index.ts`
- [ ] 1.2 Write failing tests in `core/orders/test/infrastructure/in-memory-adapters.test.ts`
      (extend existing file):
      — `listAll` returns all saved orders when multiple orders exist;
      — `listAll` returns an empty array when the repository is empty
- [ ] 1.3 Implement `listAll` on `InMemoryOrderRepository` in
      `core/orders/src/infrastructure/in-memory-order-repository.ts`
- [ ] 1.4 Verify adapter tests pass (green)
- [ ] 1.5 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [ ] 1.6 Commit: `feat(application+infra): extend OrderRepositoryPort + InMemoryOrderRepository.listAll`

## 2. Application — ListOrdersHandler (TDD)

- [ ] 2.1 Write failing tests in `core/orders/test/application/list-orders-handler.test.ts`:
      — `handler.execute()` returns all orders when orders exist in the repository;
      — `handler.execute()` returns an empty array when the repository is empty;
      — has no side effects (no saves, no audit writes, no messages published)
- [ ] 2.2 Implement `ListOrdersHandler` in
      `core/orders/src/application/list-orders-handler.ts`
- [ ] 2.3 Verify ListOrdersHandler tests pass (green)

## 3. Application — OrderAppService.listOrders (TDD)

- [ ] 3.1 Write failing tests in `core/orders/test/application/order-app-service.test.ts`
      (extend existing file):
      — `listOrders()` returns `ok([...orders])` when orders exist;
      — `listOrders()` returns `ok([])` when the repository is empty
- [ ] 3.2 Add `listOrders(): Promise<Result<Order[], never>>` to `OrderAppService`
      in `core/orders/src/application/order-app-service.ts`
- [ ] 3.3 Verify OrderAppService tests pass (green)
- [ ] 3.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [ ] 3.5 Commit: `feat(application): ListOrdersHandler + OrderAppService.listOrders facade`

## 4. Composition root — extend composeOrders (TDD)

- [ ] 4.1 Write failing tests in `core/orders/test/index.test.ts` (extend existing file):
      — `composeOrders({}).listOrders()` returns `ok([])` on an empty store
- [ ] 4.2 Extend `composeOrders(env)` in `core/orders/src/index.ts` to wire
      `ListOrdersHandler`; pass it to `OrderAppService`
- [ ] 4.3 Verify composition root tests pass (green)
- [ ] 4.4 Run `pnpm run lint` and `pnpm dlx prettier --write .`
- [ ] 4.5 Commit: `feat(infra): composeOrders wires ListOrdersHandler`

## 5. apps/orders-api — GET /orders route (TDD)

- [ ] 5.1 Write failing tests in `apps/orders-api/test/routes.test.ts` (extend existing file):
      — `GET /orders` without JWT → 401;
      — `GET /orders` with valid JWT and empty store → 200 with body `[]`;
      — `GET /orders` with valid JWT and existing orders → 200 with array of `OrderResponseDto`
- [ ] 5.2 Implement `GET /orders` route in `apps/orders-api/src/app.ts`:
      call `appService.listOrders()`, map `ok(orders)` → 200 with each order
      serialised as `OrderResponseDto`
- [ ] 5.3 Verify route tests pass (green)
- [ ] 5.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/orders-api`
- [ ] 5.5 Commit: `feat(api): GET /orders`

## 6. Quality gate

- [ ] 6.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [ ] 6.2 Run `pnpm run test` across workspace — all tests green
- [ ] 6.3 Run `/code-review` on the full change
- [ ] 6.4 Archive this change with `/opsx:archive`
