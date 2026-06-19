# ADR-0016: Adapter selection by per-adapter env flags in the composition root

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

The same core must run with in-memory adapters locally and AWS adapters in the cloud, ideally
switched without code changes per app. With a manual composition root (ADR-0003) there is no
dynamic module — the selection happens in plain code.

## Decision

`composeOrders(env)` selects each adapter by a **per-adapter feature flag** read from typed env
config (not scattered `process.env` reads):

- `USE_AWS_SQS` → `SqsMessagePublisher` / SQS consumer, else in-memory queue.
- `USE_AWS_DYNAMO` → `DynamoOrderRepository` / `DynamoAuditRepository`, else in-memory repos.

```ts
// core/orders/src/index.ts
export interface Env {
  useAwsSqs: boolean;
  useAwsDynamo: boolean;
}

export function composeOrders(env: Env): OrderAppService {
  const orderRepo = env.useAwsDynamo ? new DynamoOrderRepository() : new InMemoryOrderRepository();
  const auditRepo = env.useAwsDynamo ? new DynamoAuditRepository() : new InMemoryAuditRepository();
  const publisher = env.useAwsSqs ? new SqsMessagePublisher() : new InMemoryMessagePublisher();
  // ... handlers wired with these, returns new OrderAppService({...})
}
```

Per-adapter flags (not a single `USE_AWS_MODULES`) so SQS and DynamoDB toggle independently.

## Options Considered

- **Per-adapter flags in the factory (chosen)** — one place, explicit, testable both branches.
- **Single `USE_AWS_MODULES` flag** — simpler but can't mix (e.g. real Dynamo + in-memory queue).
- **A framework DI module** — same idea via a DI container; rejected with the framework (ADR-0003).

## Trade-off Analysis

The flag branch lives in exactly one function; adapters never read flags. Switching local↔AWS is an
env change, not a code change. Cost: the factory knows all adapter variants — acceptable and explicit.

## Consequences

- Local = both flags false (in-memory); AWS Lambdas run with both true.
- A unit test forces both branches and asserts the bound adapter type.
- The combined local runtime (ADR-0010) shares one in-memory queue instance because both API and
  worker are composed in the same process.

## Action Items

1. [ ] Typed `Env` (parse + validate flags once at startup).
2. [ ] `composeOrders(env)` with the per-adapter ternaries.
3. [ ] Test both flag branches.
