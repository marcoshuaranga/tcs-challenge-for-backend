## Context

Feature 5 added real AWS adapters; Feature 7 provides the CDK stack that creates the
AWS resources those adapters target. The stack is intentionally minimal — one table,
one queue, two Lambdas, one API Gateway — matching the brief exactly. All resource
parameters (table name, queue URL, etc.) are injected as Lambda env vars from the stack,
so no hardcoded values exist outside the CDK definition.

## Goals / Non-Goals

**Goals:**
- DynamoDB table with PAY_PER_REQUEST billing, GSI1 (`GSI1PK`, `GSI1SK`), DESTROY
  removal policy (demo-safe; prevents orphaned tables).
- SQS queue with a DLQ (`maxReceiveCount` from ADR-0006); both with a retention period
  appropriate for the demo.
- `orders-api` Lambda: Node.js runtime, Hono handler bundle, DynamoDB read/write IAM,
  env vars wired from stack (`ORDERS_TABLE`, `JWT_SECRET`, `FAIL_ABOVE_AMOUNT`,
  `USE_AWS_DYNAMO=true`, `AWS_REGION`).
- `orders-worker` Lambda: Node.js runtime, SQS event source mapping from the queue,
  DynamoDB read/write + SQS receive/delete IAM, env vars wired from stack.
- API Gateway HTTP API with Lambda Proxy integration; routes `ANY /{proxy+}` to
  `orders-api` Lambda.
- Least-privilege IAM: each Lambda gets only the permissions it needs, scoped to the
  specific table ARN and queue ARN.

**Non-Goals:**
- VPC, private subnets, or security groups — demo stack runs without VPC for simplicity.
- Custom domain or ACM certificate — API Gateway default URL is sufficient.
- CloudFront or S3 hosting for `apps/web/` or `apps/api-docs/`.
- CDK pipelines or CI/CD.
- Parameter Store or Secrets Manager for `JWT_SECRET` — passed as a plain env var for
  the demo (noted as a prod concern in risks).

## Decisions

### DESTROY removal policy on all managed resources

DynamoDB, SQS, and explicitly-managed CloudWatch Log Groups all use
`RemovalPolicy.DESTROY` so `cdk destroy` cleans up completely.
For a demo/challenge context this is correct behaviour — no orphaned resources after teardown.

Alternative: `RETAIN` policy. Rejected — would require manual cleanup after the demo;
DESTROY is explicit about the demo scope.

### Explicit CloudWatch Log Groups for Lambdas

Lambda auto-creates `/aws/lambda/<name>` log groups **outside** CloudFormation's control,
so they are never deleted by `cdk destroy`. To prevent orphaned log groups after teardown,
both Lambdas define an explicit `logs.LogGroup` construct with:

- `removalPolicy: DESTROY` — deleted on `cdk destroy`
- `retention: RetentionDays.ONE_WEEK` — logs expire after 7 days (appropriate for a demo)
- `logGroup` prop wired to the Lambda so it uses the managed group instead of auto-creating one

Alternative: `logRetention` prop on `NodejsFunction`. Rejected — internally deploys a
helper Lambda with its own unmanaged log group, adding the same problem recursively. The
explicit `LogGroup` construct is cleaner and fully controlled by the stack.

### API Gateway HTTP API (not REST API)

HTTP API is lower latency, cheaper per request, and simpler to configure with Lambda
Proxy integration. The platform has no API Gateway features (custom authorizers, usage
plans, request validation) that require REST API.

Alternative: REST API. Rejected — ADR-0003 documents HTTP API as the target; no reason
to use the more expensive option.

### maxReceiveCount from ADR-0006

ADR-0006 specifies the DLQ `maxReceiveCount`. Tasks reference the ADR value directly;
the number is not re-decided here.

### JWT_SECRET as plain Lambda env var — not SSM/Secrets Manager

For the demo scope, passing `JWT_SECRET` as a plaintext env var is acceptable. The CDK
stack reads it from the CDK context or environment at synth time (`process.env.JWT_SECRET`).

Alternative: AWS Secrets Manager. Rejected — adds runtime latency, requires Lambda
permission policy update, and is over-engineering for a demo stack.

### No CDK unit tests (aws-cdk-lib/assertions)

CDK assertion tests verify synthesised CloudFormation templates. The value is real in
production stacks but marginal for a single-stack demo — the stack synthesises or it
doesn't. The quality gate is `cdk synth` producing a valid template.

Alternative: CDK snapshot tests. Rejected — YAGNI; brittle snapshot tests on a one-off
demo stack add maintenance cost for no gain.

## Risks / Trade-offs

- **JWT_SECRET in plaintext env var**: visible in Lambda console and CloudFormation
  template. Acceptable for a demo; document that production stacks must use Secrets Manager.
- **DESTROY removal policy**: `cdk destroy` deletes all data. This is intentional for
  the demo but dangerous if accidentally run in a real environment. Mitigation: stack
  name clearly identifies it as a demo stack.
- **No VPC**: Lambdas run in the default AWS network. DynamoDB and SQS are accessed
  via public endpoints (with IAM auth). Acceptable for the demo; production would add
  VPC endpoints.

## Open Questions

None — all decisions are sufficient to implement Feature 7 without ambiguity.
