## Why

`apps/api-docs` exists as a package stub but has no source and is not deployed. Reviewers
need a live OpenAPI reference for the orders API; serving it as a Lambda function makes it
reachable from the same AWS environment without extra hosting infrastructure.

## What Changes

- **New**: `apps/api-docs/src/` — Hono app that generates an OpenAPI spec from
  `@tcs-challenge-for-backend/contracts` (via `zod-to-openapi`) and serves the Scalar
  UI via `@scalar/hono-api-reference`. Includes a `lambda.ts` entry point using
  `hono/aws-lambda`.
- **Modified**: `TcsChallengeStack` — adds a third `NodejsFunction` (api-docs Lambda),
  an explicit managed `LogGroup`, a dedicated `HttpApi`, and a `CfnOutput` for the URL.
  No DynamoDB or SQS permissions needed.

## Capabilities

### New Capabilities

- `api-docs-lambda`: Hono app (`apps/api-docs/src/`) that serves the OpenAPI spec and
  Scalar UI; Lambda entry point at `apps/api-docs/src/lambda.ts`.

### Modified Capabilities

- `cdk-stack`: Add api-docs `NodejsFunction` + `LogGroup` + `HttpApi` + `CfnOutput`.

## Impact

- Adds `apps/api-docs/src/` source files.
- Adds `hono` as a runtime dependency of `apps/api-docs` (already has `@scalar/hono-api-reference`
  and `@asteasolutions/zod-to-openapi`).
- Modifies `apps/iac/lib/tcs-challenge-stack.ts`.
- No changes to `core/`, `orders-api`, or `orders-worker`.

## Non-Goals

- Auth on the docs endpoint — publicly accessible for the demo.
- Hosting `apps/web/` — out of scope.
- Custom domain or ACM cert.
