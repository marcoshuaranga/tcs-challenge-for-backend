## Context

Features 1–4 deliver a complete functional platform backed entirely by in-memory adapters.
The hexagonal architecture means the domain and application layers are already decoupled
from persistence; `composeOrders(env)` is the only place that knows which adapter is used.
Feature 5 adds three AWS-backed adapter classes and extends the composition root to select
them via env flags. No handler, route, domain, or port interface changes.

## Goals / Non-Goals

**Goals:**
- Implement `DynamoOrderRepository` satisfying `OrderRepositoryPort` (`findById`, `save`, `listAll`).
- Implement `DynamoAuditRepository` satisfying `AuditRepositoryPort` (`append`, `findByOrderId`).
- Implement `SqsMessagePublisher` satisfying `MessagePublisherPort` (`publish`).
- Extend `composeOrders(env)` to select DynamoDB/SQS adapters when `USE_AWS_DYNAMO`/`USE_AWS_SQS` are set.
- Support DynamoDB Local via `DDB_ENDPOINT` for local development and integration tests.

**Non-Goals:**
- DLQ, dead-letter handling, SQS visibility timeout tuning — Feature 7 (IaC).
- IAM roles and CDK stack — Feature 7.
- Pagination on `listAll` — decided against in Feature 4.
- Data migration from in-memory to DynamoDB — adapters always start empty.

## Decisions

### Single-table design: orders and audit entries in one DynamoDB table

One table (`ORDERS_TABLE`). Access patterns drive the key schema:

| Entity | PK | SK | GSI1PK | GSI1SK |
|---|---|---|---|---|
| Order | `ORDER#<id>` | `METADATA` | `ORDERS` | `<createdAt>` |
| AuditEntry | `ORDER#<orderId>` | `AUDIT#<timestamp>#<uuid>` | — | — |

- `findById`: `GetItem` PK=`ORDER#<id>`, SK=`METADATA`.
- `save`: `PutItem` (upsert) on the same key.
- `listAll`: GSI1 query PK=`ORDERS`, sorted by `createdAt` ascending.
- `findByOrderId`: `Query` PK=`ORDER#<orderId>`, SK `begins_with AUDIT#` — naturally ordered by timestamp.
- `append`: `PutItem`; SK suffix `#<uuid>` prevents collision when two entries share the same millisecond.

Alternative: two tables (one for orders, one for audit). Rejected — ADR-0003 mandates
single-table design; separate tables add operational overhead with no benefit at this scale.

### dynamodb-toolbox for item marshalling

`dynamodb-toolbox` provides TypeScript-typed entity definitions, attribute marshalling,
and query builders over the AWS SDK. The stack already declares it as a dependency (ADR-0001).

Alternative: raw `@aws-sdk/lib-dynamodb` DocumentClient with manual marshalling. Rejected —
requires hand-written attribute maps and type casts; dynamodb-toolbox eliminates that
boilerplate while keeping full control over the key schema.

### DynamoDB adapter tests are integration tests against DynamoDB Local

Unit-testing DynamoDB adapters with a mocked SDK client tests the wrong thing — it verifies
that the mock returns what we tell it to, not that the marshalling and query expressions
are correct. Integration tests against DynamoDB Local (`DDB_ENDPOINT`) catch real
serialisation and access-pattern bugs before deployment.

Test files check for `DDB_ENDPOINT` at the suite level; the suite is skipped (`.skip`)
when the env var is absent so CI without DynamoDB Local does not fail.

Alternative: mock `@aws-sdk/client-dynamodb`. Rejected — masks the most common DynamoDB
bugs (wrong key name, missing attribute, bad sort key expression).

### SqsMessagePublisher tests mock the SQS client

Unlike DynamoDB, SQS Local (LocalStack) adds significant setup complexity for a minimal
benefit: all that `SqsMessagePublisher.publish` does is call `SendMessageCommand` with
`{ QueueUrl, MessageBody }`. A spy/mock verifying those two fields is sufficient.

Alternative: integration test with LocalStack SQS. Rejected — out of scope for this
feature; the IaC feature (7) is the right place to do end-to-end queue smoke tests.

### composeOrders reads typed env config — adapters never read flags directly

`composeOrders(env)` receives a typed config object (already the pattern from Feature 1).
It reads `USE_AWS_DYNAMO` and `USE_AWS_SQS` and instantiates the correct adapter.
Adapter classes receive their dependencies (table reference, SQS client, queue URL) via
constructor — no direct `process.env` access inside adapters.

Alternative: adapters read their own env vars. Rejected — violates ADR-0003; adapter
selection must be centralised in the composition root.

## Risks / Trade-offs

- **DynamoDB Local not available in all CI environments**: integration tests skip when
  `DDB_ENDPOINT` is absent — CI green, but adapter not exercised. Mitigation: document
  in README that `DDB_ENDPOINT` must be set for full test coverage.
- **GSI1 eventual consistency for `listAll`**: DynamoDB GSI1 queries are eventually
  consistent by default. For the challenge scope (no strict read-after-write on list),
  this is acceptable. Mitigation: use `ConsistentRead: false` explicitly; note in docs.
- **Single-table SK collision on audit append**: two audit entries for the same order at
  the exact same millisecond would collide without the `#<uuid>` suffix. The suffix
  prevents this. Mitigation: always append a short UUID to the audit SK.

## Open Questions

None — all decisions above are sufficient to implement Feature 5 without ambiguity.
