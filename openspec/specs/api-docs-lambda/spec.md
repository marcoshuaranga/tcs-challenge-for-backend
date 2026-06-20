# Spec: api-docs-lambda

## Purpose

Deploys `apps/api-docs` as an AWS Lambda function behind an HTTP API Gateway, making the
OpenAPI documentation available at a public HTTPS URL. Mirrors the pattern used by the
orders-api Lambda and CDK constructs.

## Requirements

### Requirement: api-docs Lambda handler

`apps/api-docs` SHALL expose a `handler` export (AWS Lambda handler) that wraps the Hono
application returned by `buildApp()` using `handle` from `hono/aws-lambda`.

#### Scenario: Lambda handler exists and exports handler symbol

- **WHEN** `apps/api-docs/src/lambda.ts` is imported
- **THEN** it exports a named `handler` symbol compatible with the AWS Lambda invocation contract

### Requirement: api-docs HTTP API Gateway

The CDK stack SHALL provision an `AWS::ApiGatewayV2::Api` (HTTP API) that routes all methods and
paths (`ANY /{proxy+}`) to the api-docs Lambda via a Lambda proxy integration.

#### Scenario: CDK template contains api-docs HTTP API resource

- **WHEN** the CDK stack is synthesised
- **THEN** the CloudFormation template contains a second `AWS::ApiGatewayV2::Api` resource (in
  addition to the existing `OrdersHttpApi`)

#### Scenario: CDK template contains api-docs Lambda integration

- **WHEN** the CDK stack is synthesised
- **THEN** the CloudFormation template contains a second `AWS::ApiGatewayV2::Integration` resource
  pointing to the api-docs Lambda

### Requirement: api-docs Lambda log group

The CDK stack SHALL provision a dedicated `AWS::Logs::LogGroup` for the api-docs Lambda with
7-day retention and `DESTROY` removal policy, consistent with the orders-api log group pattern.

#### Scenario: CDK template contains api-docs log group

- **WHEN** the CDK stack is synthesised
- **THEN** the CloudFormation template contains a log group with `RetentionInDays: 7` for the
  api-docs Lambda

### Requirement: api-docs URL CloudFormation output

The CDK stack SHALL export the api-docs HTTP API URL as a `CfnOutput` named `ApiDocsUrl`.

#### Scenario: ApiDocsUrl output exists after deploy

- **WHEN** `cdk deploy` completes
- **THEN** the stack outputs include `ApiDocsUrl` with a valid HTTPS URL
