## 1. Infrastructure — AuditRepositoryPort.findByOrderId + InMemoryAuditRepository (TDD)

- [x] 1.1 Add `findByOrderId(orderId: string): Promise<AuditEntry[]>` to `AuditRepositoryPort`
      in `core/orders/src/application/ports.ts`; export from `core/orders/src/application/index.ts`
- [x] 1.2 Write failing tests in `core/orders/test/infrastructure/in-memory-adapters.test.ts`
      (extend existing file):
      — `findByOrderId` returns all appended entries in insertion order;
      — `findByOrderId` returns empty array for an orderId with no entries
- [x] 1.3 Implement `findByOrderId` on `InMemoryAuditRepository` in
      `core/orders/src/infrastructure/in-memory-audit-repository.ts`
- [x] 1.4 Verify adapter tests pass (green)
- [x] 1.5 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 1.6 Commit: `feat(application+infra): extend AuditRepositoryPort + InMemoryAuditRepository.findByOrderId`

## 2. Application — GetOrderHandler (TDD)

- [x] 2.1 Write failing tests in `core/orders/test/application/get-order-handler.test.ts`:
      — returns the `Order` for a known orderId;
      — throws `OrderNotFoundError` for an unknown orderId;
      — has no side effects (no saves, no audit writes)
- [x] 2.2 Implement `GetOrderHandler` in
      `core/orders/src/application/get-order-handler.ts`
- [x] 2.3 Verify GetOrderHandler tests pass (green)

## 3. Application — GetOrderAuditHandler (TDD)

- [x] 3.1 Write failing tests in `core/orders/test/application/get-order-audit-handler.test.ts`:
      — returns audit entries in insertion order for a known order;
      — returns empty array for an order with no audit entries;
      — throws `OrderNotFoundError` when the order does not exist
- [x] 3.2 Implement `GetOrderAuditHandler` in
      `core/orders/src/application/get-order-audit-handler.ts`
- [x] 3.3 Verify GetOrderAuditHandler tests pass (green)

## 4. Application — OrderAppService query methods (TDD)

- [x] 4.1 Write failing tests in `core/orders/test/application/order-app-service.test.ts`
      (extend existing file):
      — `getOrder(orderId)` returns `ok(order)` for a known order;
      — `getOrder('nonexistent')` returns `err(OrderNotFoundError)`;
      — `getOrderAudit(orderId)` returns `ok([...entries])` for a known order;
      — `getOrderAudit('nonexistent')` returns `err(OrderNotFoundError)`
- [x] 4.2 Add `getOrder(orderId: string): Promise<Result<Order, AppError>>` and
      `getOrderAudit(orderId: string): Promise<Result<AuditEntry[], AppError>>` to
      `OrderAppService` in `core/orders/src/application/order-app-service.ts`
- [x] 4.3 Verify OrderAppService tests pass (green)
- [x] 4.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 4.5 Commit: `feat(application): GetOrderHandler, GetOrderAuditHandler, getOrder/getOrderAudit facade`

## 5. Composition root — extend composeOrders (TDD)

- [x] 5.1 Write failing tests in `core/orders/test/index.test.ts` (extend existing file):
      — `composeOrders({}).getOrder('nonexistent')` returns `err(OrderNotFoundError)`;
      — `composeOrders({}).getOrderAudit('nonexistent')` returns `err(OrderNotFoundError)`
- [x] 5.2 Extend `composeOrders(env)` in `core/orders/src/index.ts` to wire
      `GetOrderHandler` and `GetOrderAuditHandler`; pass them to `OrderAppService`
- [x] 5.3 Verify composition root tests pass (green)
- [x] 5.4 Run `pnpm run lint` and `pnpm dlx prettier --write .`
- [x] 5.5 Commit: `feat(infra): composeOrders wires GetOrderHandler + GetOrderAuditHandler`

## 6. apps/orders-api — GET /orders/:id route (TDD)

- [x] 6.1 Write failing tests in `apps/orders-api/test/routes.test.ts` (extend existing file):
      — `GET /orders/:id` without JWT → 401;
      — `GET /orders/:id` with valid JWT and unknown id → 404 with error envelope;
      — `GET /orders/:id` with valid JWT and known id → 200 with `OrderResponseDto` shape
- [x] 6.2 Implement `GET /orders/:id` route in `apps/orders-api/src/app.ts`:
      call `appService.getOrder(id)`, map `ok(order)` → 200 with order serialised as
      `OrderResponseDto`, map `err(OrderNotFoundError)` → 404 with error envelope
- [x] 6.3 Verify route tests pass (green)

## 7. apps/orders-api — GET /orders/:id/audit route (TDD)

- [x] 7.1 Write failing tests in `apps/orders-api/test/routes.test.ts` (extend existing file):
      — `GET /orders/:id/audit` without JWT → 401;
      — `GET /orders/:id/audit` with valid JWT and unknown id → 404 with error envelope;
      — `GET /orders/:id/audit` with valid JWT and known order with entries → 200 with array;
      — `GET /orders/:id/audit` with valid JWT and known order with no entries → 200 with `[]`
- [x] 7.2 Implement `GET /orders/:id/audit` route in `apps/orders-api/src/app.ts`:
      call `appService.getOrderAudit(id)`, map `ok(entries)` → 200 with JSON array,
      map `err(OrderNotFoundError)` → 404 with error envelope
- [x] 7.3 Verify route tests pass (green)
- [x] 7.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/orders-api`
- [x] 7.5 Commit: `feat(api): GET /orders/:id and GET /orders/:id/audit`

## 8. Quality gate

- [x] 8.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [x] 8.2 Run `pnpm run test` across workspace — all tests green
- [ ] 8.3 Run `/code-review` on the full change
- [ ] 8.4 Archive this change with `/opsx:archive`
