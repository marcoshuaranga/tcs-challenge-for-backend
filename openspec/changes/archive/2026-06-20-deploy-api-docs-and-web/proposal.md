## Why

`apps/api-docs` and `apps/web` exist in the monorepo but are only runnable locally — the CDK stack deploys only `orders-api` and `orders-worker`. Making the platform accessible end-to-end in AWS (docs + frontend reachable via public URLs) completes the deployable scope of the TCS challenge.

## What Changes

- **`apps/api-docs`**: add a `src/lambda.ts` handler (same `hono/aws-lambda` pattern as `orders-api`) and a new Lambda + HTTP API Gateway construct in the CDK stack.
- **`apps/web`**: deploy the pre-built Astro `dist/` to an S3 bucket served via a CloudFront distribution (OAC-protected, HTTPS redirect, SPA 404 fallback).
- **CDK stack** (`apps/iac/lib/tcs-challenge-stack.ts`): new constructs for both deployments + `CfnOutput` for `ApiDocsUrl` and `WebUrl`.
- **CDK tests** (`apps/iac/test/tcs-challenge-stack.test.ts`): update resource-count assertions to reflect the two new Lambda integrations and new S3/CloudFront resources.

## Non-Goals

- Custom domain / Route 53 / ACM certificate.
- CI/CD pipeline for automated builds and deploys.
- Astro SSR mode — `apps/web` remains `output: 'static'`.

## Capabilities

### New Capabilities

- `api-docs-lambda`: `apps/api-docs` exposed as a Lambda function behind an HTTP API Gateway, identical deployment pattern to `orders-api`.
- `web-static-site`: `apps/web` static build deployed to S3 + CloudFront; build-time env vars (`PUBLIC_API_URL`, `PUBLIC_API_DOCS_URL`, `PUBLIC_DEMO_JWT`) sourced from CDK outputs of prior deploys.

### Modified Capabilities

<!-- none — no existing spec-level requirements change -->

## Impact

- `apps/api-docs/src/lambda.ts` — new file
- `apps/iac/lib/tcs-challenge-stack.ts` — new constructs (api-docs Lambda + HTTP API, S3 bucket, CloudFront distribution, BucketDeployment)
- `apps/iac/test/tcs-challenge-stack.test.ts` — updated assertions
- `apps/iac/package.json` — may need `aws-cdk-lib` sub-module imports already present (no new deps expected)
