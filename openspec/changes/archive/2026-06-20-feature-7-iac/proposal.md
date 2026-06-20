## Why

The platform has working code (Features 1–6) and real AWS adapters (Feature 5) but no
infrastructure definition to actually deploy it. Feature 7 adds an AWS CDK TypeScript
stack in `apps/iac/` that provisions all required AWS resources and wires the Lambda
functions with the correct env vars, IAM roles, and event sources.

## What Changes

- **New**: `apps/iac/` — AWS CDK TypeScript app with a single stack (`TcsChallengeStack`)
  containing:
  - DynamoDB table (PAY_PER_REQUEST, GSI1, DESTROY removal policy for demo).
  - SQS queue + DLQ (`maxReceiveCount` per ADR-0006).
  - Lambda for `orders-api` (Hono via `hono/aws-lambda`).
  - Lambda for `orders-worker` (SQS event source mapping).
  - API Gateway HTTP API with Lambda Proxy integration routing all `/orders*` paths.
  - Least-privilege IAM roles: `orders-api` Lambda has DynamoDB read/write; `orders-worker`
    Lambda has DynamoDB read/write + SQS receive/delete.
  - Env vars injected from stack outputs: `ORDERS_TABLE`, `QUEUE_URL`, `JWT_SECRET`
    (from SSM or env), `FAIL_ABOVE_AMOUNT`, `AWS_REGION`.
- **New dependency**: `aws-cdk-lib`, `constructs` in `apps/iac/package.json`.

## Capabilities

### New Capabilities

- `cdk-stack`: Defines all AWS resources — DynamoDB table, SQS queue + DLQ, two
  Lambda functions, API Gateway HTTP API, IAM roles — in a single deployable CDK stack.

### Modified Capabilities

<!-- none — no existing behavior changes; IaC is additive -->

## Impact

- Creates `apps/iac/` as a new workspace package.
- No changes to `core/orders`, application layer, adapters, or any app other than `iac`.
- Adds `apps/iac` to `pnpm-workspace.yaml`.
- Stack is deployable with `pnpm --filter iac cdk deploy` given valid AWS credentials.

## Non-Goals

- CI/CD pipeline — out of scope per the brief.
- Production hardening (WAF, VPC, custom domain, ACM cert) — demo stack only.
- Hosting `apps/web/` — static site deployment (S3 + CloudFront) is out of scope.
- Hosting `apps/api-docs/` — also out of scope; served locally for the demo.
- CDK tests (e.g., `aws-cdk-lib/assertions`) — stack synthesis is the verification.
