# AWS Infrastructure Diagram

> Reflects the CDK stack in `apps/iac/lib/tcs-challenge-stack.ts`.
> All resources are deployed into a single CloudFormation stack: **TcsChallengeStack**.

---

## Full topology

```mermaid
flowchart TB
  Browser(["Browser / API Client"])

  subgraph CF_S3["Static frontend — S3 + CloudFront"]
    CF["CloudFront Distribution\nURL-rewrite Function\n(viewer request)"]
    S3["S3 Bucket\nAstro static build\n(private, OAC)"]
    CF -->|origin request| S3
  end

  subgraph Orders_API["Orders API — HTTP API + Lambda"]
    APIGW["API Gateway HTTP API\n/{proxy+} ANY"]
    ApiLambda["orders-api Lambda\nHono · Bearer JWT\nNODE_BUNDLING esbuild"]
    ApiLog["CloudWatch LogGroup\n/aws/lambda/orders-api\n1 week retention"]
    APIGW --> ApiLambda
    ApiLambda -. logs .-> ApiLog
  end

  subgraph Docs_API["API Docs — HTTP API + Lambda"]
    APIGW_D["API Gateway HTTP API\n/{proxy+} ANY"]
    DocsLambda["api-docs Lambda\nHono · Scalar UI\nzod-to-openapi"]
    DocsLog["CloudWatch LogGroup\n/aws/lambda/api-docs\n1 week retention"]
    APIGW_D --> DocsLambda
    DocsLambda -. logs .-> DocsLog
  end

  subgraph Messaging["Async messaging — SQS"]
    Queue["orders-queue\nSQS Standard Queue"]
    DLQ["orders-dlq\nSQS Dead-Letter Queue\nmaxReceiveCount=3\n14-day retention"]
    Queue -. "after 3 failures" .-> DLQ
  end

  subgraph Worker["Order processor — Lambda"]
    WorkerLambda["orders-worker Lambda\nSQS event source mapping\nbatchSize=1"]
    WorkerLog["CloudWatch LogGroup\n/aws/lambda/orders-worker\n1 week retention"]
    WorkerLambda -. logs .-> WorkerLog
  end

  subgraph Data["Data — DynamoDB single table"]
    DDB["orders table\nPAY_PER_REQUEST\nPK · SK"]
    GSI["GSI1\nGSI1PK · GSI1SK\n(list all orders)"]
    DDB --- GSI
  end

  Browser -->|"HTTPS (static assets)"| CF
  Browser -->|"HTTPS · Bearer JWT"| APIGW
  Browser -->|HTTPS| APIGW_D

  ApiLambda -->|"PutItem · GetItem · Query"| DDB
  ApiLambda -->|SendMessage| Queue

  Queue -->|"SQS event source (batchSize=1)"| WorkerLambda
  WorkerLambda -->|"PutItem · GetItem"| DDB
```

---

## IAM — least-privilege per Lambda

| Lambda | DynamoDB | SQS |
|--------|----------|-----|
| orders-api | `PutItem` `GetItem` `Query` | `SendMessage` |
| orders-worker | `PutItem` `GetItem` `Query` | `ReceiveMessage` `DeleteMessage` `GetQueueAttributes` |
| api-docs | — | — |

Grants are scoped to the specific table ARN and queue ARN via CDK helpers
(`table.grantReadWriteData`, `queue.grantSendMessages`, `queue.grantConsumeMessages`).

---

## Request flows

### Create + process an order

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant GW as API Gateway
  participant API as orders-api λ
  participant DDB as DynamoDB
  participant SQS as orders-queue
  participant W as orders-worker λ

  C->>GW: POST /orders (Bearer JWT)
  GW->>API: invoke
  API->>DDB: PutItem ORDER#<id> (PENDING) + AUDIT#ORDER_CREATED
  API->>SQS: SendMessage { orderId }
  API-->>C: 201 { id, status: "PENDING" }

  SQS->>W: SQS event (batchSize=1)
  W->>DDB: GetItem → PENDING ✓
  W->>DDB: PutItem PROCESSING + AUDIT#ORDER_PROCESSING_STARTED
  W->>W: FakePaymentGateway.authorize()
  alt amount ≤ FAIL_ABOVE_AMOUNT
    W->>DDB: PutItem COMPLETED + AUDIT#ORDER_COMPLETED
  else amount > FAIL_ABOVE_AMOUNT
    W->>DDB: PutItem FAILED + AUDIT#ORDER_FAILED
  end
  W-->>SQS: delete message
```

### Query order + audit trail

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant GW as API Gateway
  participant API as orders-api λ
  participant DDB as DynamoDB

  C->>GW: GET /orders/:id (Bearer JWT)
  GW->>API: invoke
  API->>DDB: GetItem PK=ORDER#<id> SK=#META
  DDB-->>API: order item
  API-->>C: 200 OrderResponse

  C->>GW: GET /orders/:id/audit (Bearer JWT)
  GW->>API: invoke
  API->>DDB: Query PK=ORDER#<id> SK begins_with AUDIT#
  DDB-->>API: audit entries (sorted)
  API-->>C: 200 AuditEntry[]
```

---

## DynamoDB single-table key schema

| Item type | PK | SK | GSI1PK | GSI1SK |
|-----------|----|----|--------|--------|
| Order | `ORDER#<id>` | `#META` | `ORDERS` | `<createdAt>#<id>` |
| Audit entry | `ORDER#<id>` | `AUDIT#<timestamp>#<event>` | — | — |

- **Get order by id** → `GetItem(PK, SK=#META)`
- **Get audit trail** → `Query(PK, SK begins_with AUDIT#)`
- **List all orders** → `Query GSI1(GSI1PK=ORDERS)` sorted by creation time

---

## CloudFormation outputs

| Output | Value |
|--------|-------|
| `OrdersApiUrl` | HTTP API endpoint for the orders API |
| `ApiDocsUrl` | HTTP API endpoint for the Scalar UI / OpenAPI spec |
| `WebUrl` | CloudFront HTTPS URL for the Astro frontend |
| `OrdersTableName` | DynamoDB table name (injected into Lambda env vars) |
| `OrdersQueueUrl` | SQS queue URL (injected into Lambda env vars) |
