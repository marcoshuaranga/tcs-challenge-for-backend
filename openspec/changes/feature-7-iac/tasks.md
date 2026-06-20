## 1. apps/iac — package setup

- [x] 1.1 Create `apps/iac/package.json` with name `@tcs-challenge-for-backend/iac`;
      add `aws-cdk-lib`, `constructs`, `esbuild` as dependencies;
      add `aws-cdk` as dev dependency; add scripts: `cdk`, `synth`, `deploy`, `destroy`
- [x] 1.2 Create `apps/iac/tsconfig.json` extending `../../tsconfig.node.json`;
      include `bin/` and `lib/`
- [x] 1.3 Create `apps/iac/cdk.json`: `{ "app": "npx ts-node bin/app.ts" }`
- [x] 1.4 Add `apps/iac` to `pnpm-workspace.yaml` if not already present;
      run `pnpm install`

## 2. apps/iac — CDK app entry point

- [x] 2.1 Create `apps/iac/bin/app.ts`: instantiate a `cdk.App()` and create
      `TcsChallengeStack` with env `{ account, region }` from env vars
      `CDK_DEFAULT_ACCOUNT` / `CDK_DEFAULT_REGION`
- [x] 2.2 Create `apps/iac/lib/tcs-challenge-stack.ts` with empty `TcsChallengeStack`
      class extending `cdk.Stack`
- [x] 2.3 Verify `pnpm --filter iac cdk ls` lists `TcsChallengeStack` without errors
- [x] 2.4 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/iac`
- [x] 2.5 Commit: `feat(iac): CDK app scaffold — bin/app.ts + empty TcsChallengeStack`

## 3. apps/iac — DynamoDB table construct (TDD)

- [x] 3.1 Write failing test in `apps/iac/test/tcs-challenge-stack.test.ts`
      using `aws-cdk-lib/assertions`:
      — stack has one `AWS::DynamoDB::Table` with `BillingMode: PAY_PER_REQUEST`;
      — table has a GSI named `GSI1`;
      — table has `DeletionPolicy: Delete` (DESTROY removal policy)
- [x] 3.2 Add `dynamodb.Table` resource to `TcsChallengeStack`:
      PAY_PER_REQUEST, PK + SK string keys, GSI1 with GSI1PK + GSI1SK string keys,
      `removalPolicy: DESTROY`; export table name as `CfnOutput`
- [x] 3.3 Verify CDK assertion tests pass (green)
- [x] 3.4 Run `pnpm --filter iac cdk synth` — template valid
- [x] 3.5 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/iac`
- [x] 3.6 Commit: `feat(iac): DynamoDB table`

## 4. apps/iac — SQS queue + DLQ construct (TDD)

- [ ] 4.1 Extend failing tests in `apps/iac/test/tcs-challenge-stack.test.ts`:
      — stack has two `AWS::SQS::Queue` resources;
      — main queue `RedrivePolicy` references the DLQ with `maxReceiveCount: 3`
      (ADR-0006 value);
      — DLQ has `MessageRetentionPeriod` of 14 days (1209600 seconds)
- [ ] 4.2 Add DLQ (`sqs.Queue`, 14-day retention, `removalPolicy: DESTROY`) and
      main queue (`sqs.Queue`, redrive policy pointing at DLQ, `removalPolicy: DESTROY`);
      export queue URL as `CfnOutput`
- [ ] 4.3 Verify CDK assertion tests pass (green)
- [ ] 4.4 Run `pnpm --filter iac cdk synth` — template valid
- [ ] 4.5 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/iac`
- [ ] 4.6 Commit: `feat(iac): SQS queue + DLQ`

## 5. apps/iac — orders-api Lambda + API Gateway (TDD)

- [ ] 5.1 Extend failing tests in `apps/iac/test/tcs-challenge-stack.test.ts`:
      — stack has an `AWS::Logs::LogGroup` for orders-api with `RetentionInDays: 7`
      and `DeletionPolicy: Delete`;
      — stack has an `AWS::Lambda::Function` with env vars `ORDERS_TABLE`,
      `USE_AWS_DYNAMO`, `JWT_SECRET`, `FAIL_ABOVE_AMOUNT`;
      — that Lambda has a DynamoDB IAM policy scoped to the table ARN;
      — stack has an `AWS::ApiGatewayV2::Api` and an
      `AWS::ApiGatewayV2::Integration` pointing at the orders-api Lambda
- [ ] 5.2 Add explicit `logs.LogGroup` for orders-api:
      `retention: RetentionDays.ONE_WEEK`, `removalPolicy: DESTROY`
- [ ] 5.3 Add `orders-api` Lambda (`NodejsFunction` pointing at
      `apps/orders-api/src/lambda.ts`); set env vars: `ORDERS_TABLE`,
      `JWT_SECRET` (from `process.env.JWT_SECRET`), `FAIL_ABOVE_AMOUNT`,
      `USE_AWS_DYNAMO=true`, `AWS_REGION`; wire `logGroup` prop to the managed log group;
      grant `table.grantReadWriteData(ordersApiLambda)`
- [ ] 5.4 Add `HttpApi` with `HttpLambdaIntegration` routing `ANY /{proxy+}` to
      `orders-api` Lambda; export API URL as `CfnOutput`
- [ ] 5.5 Verify CDK assertion tests pass (green)
- [ ] 5.6 Run `pnpm --filter iac cdk synth` — template valid
- [ ] 5.7 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/iac`
- [ ] 5.8 Commit: `feat(iac): orders-api Lambda + API Gateway`

## 6. apps/iac — orders-worker Lambda + SQS event source (TDD)

- [ ] 6.1 Extend failing tests in `apps/iac/test/tcs-challenge-stack.test.ts`:
      — stack has an `AWS::Logs::LogGroup` for orders-worker with `RetentionInDays: 7`
      and `DeletionPolicy: Delete`;
      — stack has a second `AWS::Lambda::Function` with env vars `ORDERS_TABLE`,
      `QUEUE_URL`, `USE_AWS_DYNAMO`, `USE_AWS_SQS`;
      — that Lambda has an `AWS::Lambda::EventSourceMapping` with `BatchSize: 1`
      pointing at the main SQS queue
- [ ] 6.2 Add explicit `logs.LogGroup` for orders-worker:
      `retention: RetentionDays.ONE_WEEK`, `removalPolicy: DESTROY`
- [ ] 6.3 Add `orders-worker` Lambda (`NodejsFunction` pointing at
      `apps/orders-worker/src/lambda-handler.ts`); set env vars: `ORDERS_TABLE`,
      `QUEUE_URL` (from `queue.queueUrl`), `FAIL_ABOVE_AMOUNT`,
      `USE_AWS_DYNAMO=true`, `USE_AWS_SQS=true`, `AWS_REGION`; wire `logGroup` prop
      to the managed log group;
      grant `table.grantReadWriteData(ordersWorkerLambda)` and
      `queue.grantConsumeMessages(ordersWorkerLambda)`
- [ ] 6.4 Add SQS event source:
      `ordersWorkerLambda.addEventSource(new SqsEventSource(queue, { batchSize: 1 }))`
- [ ] 6.5 Verify CDK assertion tests pass (green)
- [ ] 6.6 Run `pnpm --filter iac cdk synth` — template valid
- [ ] 6.7 Run `pnpm run lint` and `pnpm dlx prettier --write .` on `apps/iac`
- [ ] 6.8 Commit: `feat(iac): orders-worker Lambda + SQS event source mapping`

## 7. Quality gate

- [ ] 7.1 Run `pnpm run typecheck` across workspace — zero TypeScript errors
- [ ] 7.2 Run `pnpm run test` across workspace — all CDK assertion tests green
- [ ] 7.3 Run `pnpm --filter iac cdk synth` — final template valid with all resources
- [ ] 7.4 Archive this change with `/opsx:archive`
