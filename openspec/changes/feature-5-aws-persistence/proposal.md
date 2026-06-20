## Why

The platform runs entirely on in-memory adapters: data is lost on restart and the system
cannot deploy to AWS. Feature 5 replaces the three in-memory adapters with real AWS
implementations — DynamoDB for persistence and SQS for message publishing — with zero
changes to handlers, routes, or domain logic.

## What Changes

- **New**: `DynamoOrderRepository` — implements `OrderRepositoryPort` (`findById`, `save`,
  `listAll`) backed by DynamoDB via `dynamodb-toolbox`, single-table design.
- **New**: `DynamoAuditRepository` — implements `AuditRepositoryPort` (`append`,
  `findByOrderId`) on the same DynamoDB table, GSI1 for order-scoped queries.
- **New**: `SqsMessagePublisher` — implements `MessagePublisherPort` (`publish`) by
  sending `ProcessOrderMessage` JSON to an SQS queue via `@aws-sdk/client-sqs`.
- **Modified**: `composeOrders(env)` — selects DynamoDB adapters when `USE_AWS_DYNAMO=true`
  and SQS adapter when `USE_AWS_SQS=true`; falls back to in-memory otherwise.
- **New dependency**: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`,
  `dynamodb-toolbox` (already planned in stack), `@aws-sdk/client-sqs`.
- **Config**: `ORDERS_TABLE`, `QUEUE_URL`, `AWS_REGION`, `DDB_ENDPOINT`
  (for DynamoDB Local) read from env in `composeOrders(env)`.

## Capabilities

### New Capabilities

- `dynamo-order-repository`: DynamoDB-backed implementation of `OrderRepositoryPort`
  (`findById`, `save`, `listAll`); single-table, `DDB_ENDPOINT` for local dev.
- `dynamo-audit-repository`: DynamoDB-backed implementation of `AuditRepositoryPort`
  (`append`, `findByOrderId`); same table, GSI1 for order-scoped audit queries.
- `sqs-message-publisher`: SQS-backed implementation of `MessagePublisherPort`
  (`publish`); sends `{ orderId }` JSON body to `QUEUE_URL`.

### Modified Capabilities

<!-- none — port contracts are unchanged; only adapter implementations are added -->

## Impact

- Adds three new adapter classes in `core/orders/src/infrastructure/`.
- Extends `core/orders/src/index.ts` (`composeOrders`) with flag-based adapter selection.
- Adds AWS SDK packages to `core/orders/package.json`.
- No changes to domain, application layer, handlers, routes, or worker logic.
- DynamoDB Local (`DDB_ENDPOINT`) lets integration tests and local dev run without AWS.

## Non-Goals

- Migrating existing in-memory data — adapters start empty in all environments.
- DLQ setup — infrastructure concern, covered in Feature 7 (IaC).
- Pagination on `listAll` — out of scope per Feature 4 decision.
- IAM roles and CDK stack — Feature 7.
