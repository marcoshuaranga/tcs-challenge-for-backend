## 1. apps/api-docs — package + source setup

- [x] 1.1 Add `hono` as a runtime dependency in `apps/api-docs/package.json`;
      run `pnpm install`
- [x] 1.2 Create `apps/api-docs/src/app.ts`: export `makeDocsApp()` — a Hono app with
      `GET /openapi.json` (generates OpenAPI 3.1 spec via `@asteasolutions/zod-to-openapi`
      from `@tcs-challenge-for-backend/contracts` schemas) and Scalar UI at `GET /`
      via `@scalar/hono-api-reference`
- [x] 1.3 Create `apps/api-docs/src/lambda.ts`: wrap `makeDocsApp()` with `handle`
      from `hono/aws-lambda`; export as `handler`
- [x] 1.4 Create `apps/api-docs/src/index.ts`: local dev server using `@hono/node-server`
      on `PORT` (default 3002)
- [x] 1.5 Run `pnpm dlx prettier --write apps/api-docs/src/` and
      `pnpm --filter @tcs-challenge-for-backend/api-docs typecheck` — zero errors
- [x] 1.6 Commit: `feat(api-docs): Hono app — OpenAPI spec + Scalar UI + lambda entry`

## 2. apps/iac — api-docs Lambda + HTTP API (TDD)

- [x] 2.1 Extend failing tests in `apps/iac/test/tcs-challenge-stack.test.ts`:
      — stack has three `AWS::Logs::LogGroup` resources;
      — stack has three `AWS::Lambda::Function` resources;
      — stack has two `AWS::ApiGatewayV2::Api` resources;
      — stack has two `AWS::ApiGatewayV2::Integration` resources
- [x] 2.2 Add explicit `logs.LogGroup` for api-docs (`OrdersApiDocsLogGroup`):
      `retention: RetentionDays.ONE_WEEK`, `removalPolicy: DESTROY`
- [x] 2.3 Add `api-docs` Lambda (`NodejsFunction` pointing at
      `apps/api-docs/src/lambda.ts`); wire `logGroup` prop to the managed log group;
      no env vars, no IAM grants
- [x] 2.4 Add dedicated `HttpApi` (`ApiDocsHttpApi`) with `HttpLambdaIntegration`
      routing `ANY /{proxy+}` to the api-docs Lambda; export URL as `CfnOutput`
      `ApiDocsUrl`
- [x] 2.5 Verify CDK assertion tests pass (green)
- [x] 2.6 Run `pnpm --filter @tcs-challenge-for-backend/iac cdk synth` — template valid
- [x] 2.7 Run `pnpm dlx prettier --write apps/iac/` on changed files
- [x] 2.8 Commit: `feat(iac): api-docs Lambda + HTTP API`

## 3. Quality gate

- [x] 3.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [x] 3.2 Run `pnpm run test` across workspace — all tests green
- [x] 3.3 Run `pnpm --filter @tcs-challenge-for-backend/iac cdk synth` — final template
      valid with three Lambdas, two APIs, three log groups
- [x] 3.4 Archive this change with `/opsx:archive`
