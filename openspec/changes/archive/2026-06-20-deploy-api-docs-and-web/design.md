## Context

The CDK stack (`apps/iac/lib/tcs-challenge-stack.ts`) already deploys two Lambda functions:
`orders-api` (Hono/Lambda + HTTP API Gateway) and `orders-worker` (SQS-triggered). Two apps remain
local-only: `apps/api-docs` (Hono, serves OpenAPI via Scalar) and `apps/web` (Astro, purely static
`output: 'static'`, three pre-rendered pages).

The `apps/api-docs` app exports `buildApp()` from `src/app.ts`; no env vars are needed at runtime
because the OpenAPI document is generated from bundled contracts at cold-start. `apps/web` consumes
three build-time env vars (`PUBLIC_API_URL`, `PUBLIC_API_DOCS_URL`, `PUBLIC_DEMO_JWT`) baked into the
static HTML during `astro build`.

## Goals / Non-Goals

**Goals:**
- `apps/api-docs` publicly reachable via an HTTPS URL (Lambda + HTTP API Gateway).
- `apps/web` publicly reachable via an HTTPS URL (S3 + CloudFront).
- CDK assertion tests updated to reflect new resource counts.

**Non-Goals:**
- Custom domain / Route 53 / ACM certificate.
- CI/CD pipeline or automated build triggers.
- Astro SSR / server-side rendering for `apps/web`.

## Decisions

### D1 — `apps/api-docs`: Lambda + HTTP API Gateway

**Chosen:** same `NodejsFunction` + `HttpApi` pattern already used for `orders-api`.

- Entry point becomes `apps/api-docs/src/lambda.ts` — wraps `buildApp()` with `handle` from
  `hono/aws-lambda`, identical to how `orders-api/src/lambda.ts` wraps `makeApp(...)`.
- No new IAM grants needed (api-docs has no AWS dependencies).
- One env var required: `API_URL` — injected by the CDK stack as `httpApi.url` so the OpenAPI
  document's `servers[].url` points at the deployed orders-api endpoint instead of `localhost:3000`.

**Alternative considered:** serve api-docs from the same Lambda as orders-api on a sub-path.
Rejected — would couple unrelated concerns, complicate routing, and deviate from existing
single-responsibility pattern.

### D2 — `apps/web`: S3 + CloudFront

**Chosen:** `s3.Bucket` (private, OAC-protected) + `cloudfront.Distribution` + `s3deploy.BucketDeployment`.

- Astro builds to `apps/web/dist/` — all static files. There is no server-side logic, so a Lambda
  compute layer adds cold-start latency and per-invocation cost with zero benefit.
- CloudFront: `REDIRECT_TO_HTTPS`, `defaultRootObject: 'index.html'`, 404 → `index.html` (SPA
  fallback; harmless for Astro static pages where 404 is unlikely).
- `BucketDeployment` uploads from the local `dist/` directory and issues a CloudFront invalidation.
- Bucket is private — only CloudFront (via OAC) can read it.

**Alternative considered:** Lambda serving static files via `serveStatic`. Rejected — adds bundling
complexity (must copy `dist/` into esbuild output), higher per-request cost, no CDN caching.

### D3 — Build-time env vars for `apps/web`

**Chosen:** two-pass deploy for first setup; single-pass for subsequent deploys.

The CDK app is split into two stacks: `TcsChallengeStack` (API + worker + DynamoDB + SQS) and
`TcsChallengeWebStack` (S3 + CloudFront). This means the first pass can deploy backend
infrastructure without needing `apps/web/dist/` to exist yet.

First deploy:
1. `cdk deploy TcsChallengeStack-<env>` — creates API/worker/DynamoDB/SQS infrastructure.
2. Note `OrdersApiUrl` and `ApiDocsUrl` from CloudFormation outputs.
3. Set `PUBLIC_API_URL`, `PUBLIC_API_DOCS_URL`, `PUBLIC_DEMO_JWT` in shell (or `.env`).
4. `pnpm --filter web build` — builds Astro static site to `apps/web/dist/`.
5. `cdk deploy TcsChallengeWebStack-<env>` — uploads `dist/` via BucketDeployment.

Subsequent deploys: build web first (`pnpm --filter web build`), then `cdk deploy TcsChallengeWebStack-<env>`.

**Alternative considered:** CDK custom resource to build Astro during synth/deploy. Rejected —
adds opaque complexity, violates YAGNI, and doesn't match the scope of this challenge.

### D4 — CDK test updates

Exact resource counts change:
- `AWS::ApiGatewayV2::Api`: 1 → 2
- `AWS::ApiGatewayV2::Integration`: 1 → 2
- `AWS::Lambda::Function`: 2 → 3 (+ any CDK-internal BucketDeployment provider Lambdas)
- `AWS::Logs::LogGroup`: 2 → 3 (api-docs log group)
- New: `AWS::S3::Bucket`, `AWS::CloudFront::Distribution`

Lambda count assertions that include CDK-internal functions should use `resourceCountIs` with the
count verified by running `cdk synth` and inspecting the template, or switch to
`template.hasResourceProperties` targeting specific env var sets rather than exact counts.

## Risks / Trade-offs

- **Chicken-and-egg env vars** → Mitigation: documented two-pass deploy (D3 above).
- **BucketDeployment Lambda count** — CDK injects 1-2 custom-resource Lambdas; exact count depends
  on CDK version. → Mitigation: after adding constructs, run `cdk synth` and adjust test assertions
  to match the real template count.
- **CloudFront propagation delay** (~5 min) — not a risk for testing, just a latency note.
- **`dist/` must exist before `cdk deploy`** — BucketDeployment will fail if `apps/web/dist/` is
  absent. → Mitigation: document pre-build step; CDK deploy order (D3).
