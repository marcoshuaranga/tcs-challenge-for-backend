## ADDED Requirements

### Requirement: api-docs CloudWatch Log Group
The CDK stack SHALL define an explicit `logs.LogGroup` for the api-docs Lambda:
- `removalPolicy: DESTROY` — deleted on `cdk destroy`.
- `retention: RetentionDays.ONE_WEEK` — logs expire after 7 days.
- The api-docs Lambda references this log group via the `logGroup` prop.

#### Scenario: Stack synthesises with api-docs log group
- **WHEN** `cdk synth` is run
- **THEN** the template contains three `AWS::Logs::LogGroup` resources (orders-api,
  orders-worker, api-docs), each with `RetentionInDays: 7` and `DeletionPolicy: Delete`

---

### Requirement: api-docs Lambda
The CDK stack SHALL define a Node.js Lambda function for `api-docs`:
- Code bundled from `apps/api-docs/src/lambda.ts` via `NodejsFunction`.
- No env vars required beyond those Lambda provides automatically (`AWS_REGION`, etc.).
- No IAM grants — the function needs only the default Lambda execution role
  (CloudWatch Logs write access).
- Uses the explicitly-managed `LogGroup` for api-docs.

#### Scenario: Stack synthesises with api-docs Lambda
- **WHEN** `cdk synth` is run
- **THEN** the template contains three `AWS::Lambda::Function` resources (orders-api,
  orders-worker, api-docs)

---

### Requirement: api-docs HTTP API
The CDK stack SHALL define a dedicated `HttpApi` for the api-docs Lambda:
- Lambda Proxy integration routing `ANY /{proxy+}` to the api-docs Lambda.
- Auto-deploy on the `$default` stage.
- API URL exported as a `CfnOutput` named `ApiDocsUrl`.

#### Scenario: Stack synthesises with api-docs HTTP API
- **WHEN** `cdk synth` is run
- **THEN** the template contains two `AWS::ApiGatewayV2::Api` resources (orders and api-docs)
  and a second `AWS::ApiGatewayV2::Integration` pointing at the api-docs Lambda
