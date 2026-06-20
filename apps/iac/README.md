# TCS Challenge — AWS CDK Stack

CDK TypeScript stack for the TCS order-processing challenge. Deploys DynamoDB, SQS + DLQ,
two Lambda functions (`orders-api`, `orders-worker`), and an API Gateway HTTP API.

The `cdk.json` file tells the CDK Toolkit how to execute the app.

## Getting Started with CDK

### Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with SSO credentials (`aws configure sso`)
- AWS CDK CLI installed: `pnpm add -g aws-cdk`
- Node.js 18+

### First-time setup

Bootstrap your AWS environment (once per account/region):

```bash
pnpm cdk bootstrap --profile maracudev-sandbox
```

### Deploy

Set required env vars before deploying:

```bash
export JWT_SECRET=<your-secret>
export FAIL_ABOVE_AMOUNT=1000
```

Then:

```bash
# Preview changes
pnpm cdk diff --profile maracudev-sandbox

# Synthesize the CloudFormation template
pnpm cdk synth --profile maracudev-sandbox

# Deploy the stack
pnpm cdk deploy --profile maracudev-sandbox
```

### Destroy

Removes all stack resources (DynamoDB, SQS, Lambdas, Log Groups — all `DESTROY` policy):

```bash
pnpm cdk destroy --profile maracudev-sandbox
```

## Useful commands

- `pnpm run build` compile typescript to js
- `pnpm run watch` watch for changes and compile
- `pnpm run test` run CDK assertion tests with vitest
- `pnpm cdk synth --profile maracudev-sandbox` emit the synthesized CloudFormation template
- `pnpm cdk diff --profile maracudev-sandbox` compare deployed stack with current state
- `pnpm cdk deploy --profile maracudev-sandbox` deploy to AWS
