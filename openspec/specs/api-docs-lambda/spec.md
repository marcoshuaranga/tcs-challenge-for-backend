# Spec: api-docs-lambda

## Purpose

Deploys `apps/api-docs` as an AWS Lambda function behind an HTTP API Gateway, making the
OpenAPI documentation available at a public HTTPS URL. Mirrors the pattern used by the
orders-api Lambda and CDK constructs.

## Requirements

### Requirement: Hono app serves OpenAPI spec and Scalar UI

`apps/api-docs/src/app.ts` SHALL export a `makeDocsApp()` factory that returns a Hono app
with two routes:
- `GET /openapi.json` — returns the OpenAPI 3.1 JSON spec generated from
  `@tcs-challenge-for-backend/contracts` Zod schemas via `@asteasolutions/zod-to-openapi`.
- `GET /` — serves the Scalar UI pointing at `/openapi.json`.

The spec SHALL include `info.title`, `info.version`, and all order-related routes derived
from the contracts schemas.

#### Scenario: GET /openapi.json returns a valid OpenAPI document

- **WHEN** `GET /openapi.json` is called on the docs app
- **THEN** the response has `Content-Type: application/json` and the body contains
  `openapi: "3.1.0"` and an `info` object with `title` and `version`

#### Scenario: GET / returns the Scalar HTML UI

- **WHEN** `GET /` is called on the docs app
- **THEN** the response has `Content-Type: text/html` and the body contains Scalar
  UI markup referencing `/openapi.json`

---

### Requirement: Lambda entry point for api-docs

`apps/api-docs/src/lambda.ts` SHALL export a `handler` constant created by wrapping
`makeDocsApp()` with `handle` from `hono/aws-lambda`, following the same pattern as
`apps/orders-api/src/lambda.ts`.

#### Scenario: Lambda handler is exported

- **WHEN** `apps/api-docs/src/lambda.ts` is imported
- **THEN** it exports a `handler` symbol compatible with the `hono/aws-lambda` handle type

---

### Requirement: Local dev server for api-docs

`apps/api-docs/src/index.ts` SHALL start a local Hono server using `@hono/node-server`
so the docs can be served locally without Lambda, matching the pattern of `orders-api/src/index.ts`.

#### Scenario: Local server starts without error

- **WHEN** `node --import tsx/esm src/index.ts` is run
- **THEN** the server listens on `PORT` (default 3002) and `GET /openapi.json` returns 200

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
