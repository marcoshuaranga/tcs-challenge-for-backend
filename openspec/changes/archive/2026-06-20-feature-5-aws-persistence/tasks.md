## 1. Setup — dependencies + table schema

- [x] 1.1 Add `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `dynamodb-toolbox`,
      and `@aws-sdk/client-sqs` to `core/orders/package.json`; run `pnpm install`
- [x] 1.2 Create `core/orders/src/infrastructure/dynamo-table.ts`: define the
      `dynamodb-toolbox` `Table` with PK (`ORDER#<id>`), SK, and GSI1
      (`GSI1PK=ORDERS`, `GSI1SK=<createdAt>#<id>`) using env vars `ORDERS_TABLE`,
      `AWS_REGION`, `DDB_ENDPOINT`
- [x] 1.3 Define the `OrderEntity` and `AuditEntity` dynamodb-toolbox entity types
      in `core/orders/src/infrastructure/dynamo-entities.ts`
- [x] 1.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 1.5 Commit: `feat(infra): DynamoDB table schema + dynamodb-toolbox entity definitions`

## 2. Infrastructure — DynamoOrderRepository (TDD — DynamoDB Local)

- [x] 2.1 Write failing integration tests in
      `core/orders/test/infrastructure/dynamo-order-repository.test.ts`
      (suite skips when `DDB_ENDPOINT` is absent):
      — `findById` returns `undefined` for unknown id;
      — `save` then `findById` returns the order with all fields;
      — second `save` with same id overwrites — `findById` returns updated values;
      — `listAll` returns all saved orders;
      — `listAll` returns `[]` when table is empty
- [x] 2.2 Implement `DynamoOrderRepository` in
      `core/orders/src/infrastructure/dynamo-order-repository.ts`
- [x] 2.3 Verify DynamoOrderRepository tests pass (green, with DynamoDB Local running)
- [x] 2.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 2.5 Commit: `feat(infra): DynamoOrderRepository`

## 3. Infrastructure — DynamoAuditRepository (TDD — DynamoDB Local)

- [x] 3.1 Write failing integration tests in
      `core/orders/test/infrastructure/dynamo-audit-repository.test.ts`
      (suite skips when `DDB_ENDPOINT` is absent):
      — `append` then `findByOrderId` returns the entry;
      — two appends for same order with same timestamp do not collide;
      — `findByOrderId` returns entries in ascending timestamp order;
      — `findByOrderId` returns `[]` for an orderId with no entries
- [x] 3.2 Implement `DynamoAuditRepository` in
      `core/orders/src/infrastructure/dynamo-audit-repository.ts`;
      SK format: `AUDIT#<isoTimestamp>#<shortUuid>`
- [x] 3.3 Verify DynamoAuditRepository tests pass (green, with DynamoDB Local running)
- [x] 3.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 3.5 Commit: `feat(infra): DynamoAuditRepository`

## 4. Infrastructure — SqsMessagePublisher (TDD — mocked SQS client)

- [x] 4.1 Write failing tests in
      `core/orders/test/infrastructure/sqs-message-publisher.test.ts`:
      — `publish({ orderId })` calls `SendMessageCommand` with correct `QueueUrl`
      and `MessageBody === JSON.stringify({ orderId })`;
      — resolves without error when SQS client resolves;
      — rejects with the underlying error when SQS client throws
- [x] 4.2 Implement `SqsMessagePublisher` in
      `core/orders/src/infrastructure/sqs-message-publisher.ts`;
      constructor accepts `SQSClient` and `queueUrl: string`
- [x] 4.3 Verify SqsMessagePublisher tests pass (green)
- [x] 4.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `core/orders`
- [x] 4.5 Commit: `feat(infra): SqsMessagePublisher`

## 5. Composition root — adapter selection by env flags (TDD)

- [x] 5.1 Write failing tests in `core/orders/test/index.test.ts` (extend existing file):
      — `composeOrders({ USE_AWS_DYNAMO: 'true', ORDERS_TABLE: 't', AWS_REGION: 'us-east-1' })`
      wires `DynamoOrderRepository` (verify via instanceof or duck-type check);
      — `composeOrders({ USE_AWS_SQS: 'true', QUEUE_URL: 'https://sqs/q', AWS_REGION: 'us-east-1' })`
      wires `SqsMessagePublisher`;
      — `composeOrders({})` still wires in-memory adapters (no regression)
- [x] 5.2 Extend `composeOrders(env)` in `core/orders/src/index.ts`:
      read `USE_AWS_DYNAMO` and `USE_AWS_SQS` flags; instantiate DynamoDB/SQS adapters
      when flags are set, fall back to existing in-memory adapters otherwise
- [x] 5.3 Verify composition root tests pass (green)
- [x] 5.4 Run `pnpm run lint` and `pnpm dlx prettier --write .`
- [x] 5.5 Commit: `feat(infra): composeOrders selects DynamoDB + SQS adapters by env flags`

## 6. Quality gate

- [x] 6.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [x] 6.2 Run `pnpm run test` across workspace — all tests green (DynamoDB Local integration
      tests skip gracefully if `DDB_ENDPOINT` is absent)
- [ ] 6.3 Archive this change with `/opsx:archive`
