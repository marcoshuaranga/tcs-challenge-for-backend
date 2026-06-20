## 1. api-docs Lambda handler

- [x] 1.1 Create `apps/api-docs/src/lambda.ts` — import `handle` from `hono/aws-lambda`, call `buildApp()`, export `handler`
- [x] 1.2 Verify `pnpm --filter api-docs typecheck` passes with the new file

## 2. CDK — api-docs Lambda + HTTP API Gateway

- [x] 2.1 Add api-docs log group construct to `apps/iac/lib/tcs-challenge-stack.ts` (7-day retention, DESTROY policy)
- [x] 2.2 Add `NodejsFunction` for api-docs Lambda (entry: `../../api-docs/src/lambda.ts`, no env vars, uses log group from 2.1)
- [x] 2.3 Add `HttpApi` for api-docs and wire `ANY /{proxy+}` → api-docs Lambda via `HttpLambdaIntegration`
- [x] 2.4 Add `CfnOutput` named `ApiDocsUrl` with value `apiDocsHttpApi.url ?? ''`

## 3. CDK — web S3 + CloudFront

- [x] 3.1 Import `aws-s3`, `aws-s3-deployment`, `aws-cloudfront`, `aws-cloudfront-origins` modules in the stack file
- [x] 3.2 Add private `s3.Bucket` (`WebBucket`) with `autoDeleteObjects: true` and `DESTROY` removal policy
- [x] 3.3 Add `cloudfront.Distribution` (`WebDistribution`) with S3 OAC origin, HTTPS redirect, `defaultRootObject: 'index.html'`, 404 → `index.html` (HTTP 200)
- [x] 3.4 Add `s3deploy.BucketDeployment` sourcing `../../web/dist`, targeting `WebBucket`, invalidating `WebDistribution`
- [x] 3.5 Add `CfnOutput` named `WebUrl` with value `` `https://${webDistribution.domainName}` ``

## 4. CDK tests

- [x] 4.1 Run `cdk synth` and note exact Lambda function count (including CDK-internal BucketDeployment Lambdas)
- [x] 4.2 Update `resourceCountIs('AWS::ApiGatewayV2::Api', ...)` → 2
- [x] 4.3 Update `resourceCountIs('AWS::ApiGatewayV2::Integration', ...)` → 2
- [x] 4.4 Update `resourceCountIs('AWS::Lambda::Function', ...)` → actual count from 4.1
- [x] 4.5 Update `resourceCountIs('AWS::Logs::LogGroup', ...)` → 3 (plus any additional from BucketDeployment)
- [x] 4.6 Add assertion: `resourceCountIs('AWS::S3::Bucket', 1)`
- [x] 4.7 Add assertion: `resourceCountIs('AWS::CloudFront::Distribution', 1)`
- [x] 4.8 Run `pnpm --filter iac test` — all assertions pass

## 5. Verify & commit

- [ ] 5.1 Run `pnpm --filter iac cdk synth` — CloudFormation template generates without errors
- [ ] 5.2 Run `pnpm run typecheck` — zero errors across workspace
- [ ] 5.3 Commit: `feat(iac): deploy api-docs as Lambda + HTTP API Gateway`
- [ ] 5.4 Build web with env vars set: `pnpm --filter web build`
- [ ] 5.5 Commit: `feat(iac): deploy web static site via S3 + CloudFront`
