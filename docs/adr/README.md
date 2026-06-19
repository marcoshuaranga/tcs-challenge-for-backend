# Architecture Decision Records

One file per decision. Format follows the standard ADR convention (context, decision, options,
trade-offs, consequences). Status flips to `Accepted` on the commit that implements it.

| ADR                                              | Title                                                         | Status   |
| ------------------------------------------------ | ------------------------------------------------------------- | -------- |
| [0001](./0001-pnpm-workspaces-monorepo.md)        | pnpm workspaces monorepo                                      | Proposed |
| [0002](./0002-hono-on-lambda.md)                 | Hono on Lambda as the HTTP entrypoint                         | Proposed |
| [0003](./0003-composition-root.md)               | Manual composition root (no framework DI)                     | Proposed |
| [0004](./0004-hexagonal-layering.md)             | Hexagonal layering with OrderAppService facade                | Proposed |
| [0005](./0005-dynamodb-single-table.md)          | DynamoDB + dynamodb-toolbox single-table design               | Proposed |
| [0006](./0006-sqs-dlq-async.md)                  | SQS + DLQ for async processing                                | Proposed |
| [0007](./0007-cqrs-transport-bridge.md)          | Plain command/query handlers + cross-process transport        | Proposed |
| [0008](./0008-state-machine.md)                  | State machine with explicit orchestration                     | Proposed |
| [0009](./0009-explicit-audit-command.md)         | Explicit audit via command (not Streams)                      | Proposed |
| [0010](./0010-local-combined-runtime.md)         | Local in-memory transport ⇒ combined local runtime            | Proposed |
| [0011](./0011-aws-cdk-iac.md)                    | AWS CDK for IaC                                               | Proposed |
| [0012](./0012-contracts-zod-openapi.md)          | Contracts single source of truth (Zod → OpenAPI)              | Proposed |
| [0013](./0013-payment-gateway-failed-trigger.md) | PaymentGatewayPort as the FAILED trigger                      | Proposed |
| [0014](./0014-minor-decisions.md)                | Minor decisions log                                           | Proposed |
| [0015](./0015-eslint-prettier-boundaries.md)     | ESLint + Prettier for code style; ESLint for boundaries       | Proposed |
| [0016](./0016-composition-per-adapter-flags.md)  | Adapter selection by per-adapter env flags (composition root) | Proposed |
