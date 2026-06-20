## ADDED Requirements

### Requirement: DynamoDB table
The CDK stack SHALL define a DynamoDB table with:
- `billingMode: PAY_PER_REQUEST`.
- Partition key `PK` (String) and sort key `SK` (String).
- A GSI named `GSI1` with partition key `GSI1PK` (String) and sort key `GSI1SK` (String).
- `removalPolicy: DESTROY`.
- Table name exported as a stack output and injected into Lambda env vars as `ORDERS_TABLE`.

#### Scenario: Stack synthesises with DynamoDB table resource
- **WHEN** `cdk synth` is run
- **THEN** the synthesised CloudFormation template contains a `AWS::DynamoDB::Table`
  resource with `BillingMode: PAY_PER_REQUEST` and a GSI named `GSI1`

---

### Requirement: SQS queue + DLQ
The CDK stack SHALL define an SQS queue with a dead-letter queue.
- DLQ: standard SQS queue with message retention of 14 days.
- Main queue: `deadLetterQueue: { queue: dlq, maxReceiveCount: <ADR-0006 value> }`.
- `removalPolicy: DESTROY` on both queues.
- Queue URL exported and injected as `QUEUE_URL` into `orders-worker` Lambda env vars.

#### Scenario: Stack synthesises with SQS queue and DLQ
- **WHEN** `cdk synth` is run
- **THEN** the template contains two `AWS::SQS::Queue` resources and the main queue's
  `RedrivePolicy` references the DLQ with the correct `maxReceiveCount`

---

### Requirement: orders-api Lambda
The CDK stack SHALL define a Node.js Lambda function for `orders-api`:
- Code bundled from `apps/orders-api/` (esbuild via `NodejsFunction` or `lambda.Code.fromAsset`).
- Env vars: `ORDERS_TABLE`, `JWT_SECRET`, `FAIL_ABOVE_AMOUNT`, `USE_AWS_DYNAMO=true`,
  `AWS_REGION`.
- IAM: DynamoDB `GetItem`, `PutItem`, `Query` on the orders table ARN; no SQS permissions.
- Handler: the Hono `hono/aws-lambda` handler export.

#### Scenario: Stack synthesises with orders-api Lambda
- **WHEN** `cdk synth` is run
- **THEN** the template contains an `AWS::Lambda::Function` for orders-api with
  the required env vars and an IAM policy scoped to the DynamoDB table ARN

---

### Requirement: orders-worker Lambda + SQS event source
The CDK stack SHALL define a Node.js Lambda function for `orders-worker`:
- Code bundled from `apps/orders-worker/`.
- Env vars: `ORDERS_TABLE`, `QUEUE_URL`, `FAIL_ABOVE_AMOUNT`, `USE_AWS_DYNAMO=true`,
  `USE_AWS_SQS=true`, `AWS_REGION`.
- IAM: DynamoDB `GetItem`, `PutItem`, `Query` + SQS `ReceiveMessage`, `DeleteMessage`,
  `GetQueueAttributes` on the respective ARNs.
- SQS event source mapping: triggers on the main queue with `batchSize: 1`.

#### Scenario: Stack synthesises with orders-worker Lambda and SQS event source
- **WHEN** `cdk synth` is run
- **THEN** the template contains an `AWS::Lambda::Function` for orders-worker and an
  `AWS::Lambda::EventSourceMapping` pointing at the main SQS queue with `BatchSize: 1`

---

### Requirement: API Gateway HTTP API
The CDK stack SHALL define an API Gateway HTTP API:
- Lambda Proxy integration routing `ANY /{proxy+}` to the `orders-api` Lambda.
- Auto-deploy on the `$default` stage.
- API URL exported as a stack output.

#### Scenario: Stack synthesises with HTTP API and Lambda integration
- **WHEN** `cdk synth` is run
- **THEN** the template contains an `AWS::ApiGatewayV2::Api` resource and an
  `AWS::ApiGatewayV2::Integration` pointing at the `orders-api` Lambda
