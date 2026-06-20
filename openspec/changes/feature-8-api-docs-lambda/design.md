## Context

`apps/api-docs` exists as a package stub with `package.json` and `tsconfig.json` but no source
files. The stack (feature-7-iac) deliberately excluded it as a non-goal. This change implements
the source app and adds a third Lambda to `TcsChallengeStack`, following the identical pattern
already established for `orders-api`.

## Goals / Non-Goals

**Goals:**
- Implement `apps/api-docs/src/app.ts`: a Hono app that generates an OpenAPI 3.1 spec from
  `@tcs-challenge-for-backend/contracts` (via `@asteasolutions/zod-to-openapi`) and serves
  the Scalar UI via `@scalar/hono-api-reference`.
- Implement `apps/api-docs/src/lambda.ts`: Lambda entry point using `hono/aws-lambda`.
- Add to `TcsChallengeStack`: `logs.LogGroup` + `NodejsFunction` + `HttpApi` + `CfnOutput`
  for the api-docs Lambda, matching the orders-api pattern exactly.
- CDK assertion tests (TDD) for the new resources.

**Non-Goals:**
- Auth on the docs endpoint — publicly accessible for the demo.
- Custom domain or ACM cert.
- Hosting `apps/web/`.
- Any changes to `core/`, `orders-api`, or `orders-worker`.

## Decisions

### Separate HttpApi for api-docs (not adding routes to the existing orders HttpApi)

A dedicated `HttpApi` per application keeps IAM, logging, and URL namespacing isolated.
Adding api-docs routes to the orders-api HttpApi would couple two independent functions under
one Gateway — confusing for IAM (api-docs needs zero permissions) and for URL clarity.

Alternative: Share the orders-api `HttpApi` with a `/docs` route prefix. Rejected — couples
unrelated Lambdas under one Gateway, complicates future IAM, and means api-docs shares the
`/orders` auth middleware namespace.

### api-docs Lambda has no IAM grants

The Hono app is read-only and self-contained: it generates the OpenAPI spec from in-memory
Zod schemas. No DynamoDB, no SQS. `NodejsFunction` will create an IAM execution role with
only CloudWatch Logs permissions (the minimum Lambda requires).

### OpenAPI spec generated at request time (not at build/synth time)

The spec is derived from Zod schemas at runtime — the same schemas used for validation.
This guarantees the published spec is always in sync with the actual request/response types.

Alternative: Generate a static `openapi.json` at build time and serve it as an asset. Rejected —
creates a separate build step and risks the spec diverging from the live schemas.

### `hono` added as runtime dependency of `apps/api-docs`

`apps/api-docs/package.json` already has `@scalar/hono-api-reference` and
`@asteasolutions/zod-to-openapi` but is missing `hono` itself. Adding it is a one-line change.

## Risks / Trade-offs

- **Cold start latency**: The OpenAPI spec is generated on every cold start (Zod schema
  registration). Negligible for a demo; for production, cache the spec at module init time.
- **esbuild bundling of workspace packages**: Same concern as orders-api (already resolved
  in feature-7-iac). `@tcs-challenge-for-backend/contracts` is resolved via pnpm workspace
  symlinks; esbuild follows them correctly.
- **No auth on docs endpoint**: The docs URL is publicly accessible. Acceptable for a demo.

## Open Questions

None — the pattern (LogGroup + NodejsFunction + HttpApi + CfnOutput) is already proven by
orders-api and does not introduce new decisions.
