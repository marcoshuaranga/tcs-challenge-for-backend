# Order Processing Platform — TCS Technical Challenge

> Node.js · TypeScript · Hexagonal Architecture · AWS Serverless · pnpm Workspaces

Registers orders, processes them **asynchronously** through a guarded state machine, and keeps an
immutable audit trail for every state transition. The backend targets AWS Lambda + DynamoDB + SQS.

**All 5 required user stories are implemented. All 4 bonus deliverables are included.**

→ **[Challenge specification](./CHALLENGE.md)**

---

## User Story Coverage

| # | HU | Endpoint / Mechanism | Notes |
|---|-----|----------------------|-------|
| 1 | Registrar orden | `POST /orders` | Validates body (Zod), persists as `PENDING`, returns `201` |
| 2 | Consultar orden | `GET /orders/:id` · `GET /orders/:id/audit` | `404` if not found; full audit trail on `/audit` |
| 3 | Procesar orden | `POST /orders/:id/process` → queue → worker | Async; guarded state machine; idempotent consumer |
| 4 | Registrar auditoría | Explicit handler on every transition | `ORDER_CREATED`, `ORDER_PROCESSING_STARTED`, `ORDER_COMPLETED`, `ORDER_FAILED` |
| 5 | Seguridad básica | Bearer JWT middleware on `/orders*` | HMAC-signed token (HS256); `401` on missing/invalid |

### Bonus deliverables

| Bonus | What was built |
|-------|----------------|
| OpenAPI / Swagger | `apps/api-docs` — Hono + Scalar UI; Zod schemas compiled to OpenAPI 3.1 via `zod-to-openapi`; deployed as its own Lambda + HTTP API |
| Front básico | `apps/web` — Astro + Tailwind + DaisyUI; three pages: Landing, Customer (create & look up orders), Backoffice (orders table with status badges) |
| IaC básico | `apps/iac` — AWS CDK TypeScript stack: DynamoDB table, SQS + DLQ, all three Lambdas, HTTP API Gateways, S3 + CloudFront for the web frontend |
| Despliegue real AWS | CDK stack is ready to `cdk deploy`; every app ships a Lambda entry point (`lambda.ts` / `lambda-handler.ts`) |

---

## Proposed Design

### AWS runtime topology

```mermaid
flowchart LR
  Client[Client / web] -->|Bearer JWT| APIGW[API Gateway HTTP API]
  APIGW --> ApiLambda[orders-api Lambda — Hono]
  ApiLambda -->|PutItem / GetItem / Query| DDB[(DynamoDB\nsingle table + GSI1)]
  ApiLambda -->|SendMessage ProcessOrder| SQS[[SQS orders-queue]]
  SQS -->|event source mapping batchSize=1| WorkerLambda[orders-worker Lambda]
  WorkerLambda -->|state transitions + audit| DDB
  SQS -. maxReceiveCount=3 .-> DLQ[[SQS DLQ]]
  DocsLambda[api-docs Lambda — Hono + Scalar] -->|zod-to-openapi| Contracts[(core/contracts\nZod schemas)]
  WebBrowser[Browser] --> CF[CloudFront + S3\nAstro static site]
```

The API's responsibility ends at _"order saved as `PENDING` + `ProcessOrderMessage` enqueued."_
All processing runs in the worker Lambda independently, so the HTTP path stays fast and is
decoupled from payment latency and retries.

### State machine

```mermaid
stateDiagram-v2
  [*] --> PENDING : POST /orders
  PENDING --> PROCESSING : worker picks up message
  PROCESSING --> COMPLETED : PaymentGateway approves (amount ≤ FAIL_ABOVE_AMOUNT)
  PROCESSING --> FAILED : PaymentGateway declines (amount > FAIL_ABOVE_AMOUNT)
  COMPLETED --> [*]
  FAILED --> [*]
```

Illegal transitions throw `InvalidStateTransitionError` → HTTP `409`. The worker is **idempotent**:
redelivered messages for an already-processed order throw `InvalidStateTransitionError`, which
`OrderAppService` catches as `err(error)` — the lambda logs it and acks the message without
rethrowing, so duplicate deliveries are safe (no retry storm).

### Hexagonal layering

```mermaid
flowchart TB
  subgraph Apps["apps/ — driving adapters"]
    API["orders-api\n(Hono on Lambda)"]
    Worker["orders-worker\n(SQS consumer / local poll-loop)"]
  end
  subgraph Core["core/orders — the core"]
    App["Application\nOrderAppService · command/query handlers · ports"]
    Dom["Domain\nOrder aggregate · value objects · state machine (pure TS)"]
  end
  subgraph Infra["core/orders/src/infrastructure — driven adapters"]
    Repo["DynamoOrderRepository\nor InMemoryOrderRepository"]
    Audit["DynamoAuditRepository\nor InMemoryAuditRepository"]
    Pub["SqsMessagePublisher\nor InMemoryMessagePublisher"]
    GW["FakePaymentGateway"]
  end

  API --> App
  Worker --> App
  App --> Dom
  App -->|OrderRepositoryPort| Repo
  App -->|AuditRepositoryPort| Audit
  App -->|MessagePublisherPort| Pub
  App -->|PaymentGatewayPort| GW
```

**`core/orders/src/index.ts`** — the only file that knows concrete adapters.
`composeOrders(env)` reads `USE_AWS_DYNAMO` / `USE_AWS_SQS` flags and wires the matching adapters
into all handlers by hand (no DI framework, no `reflect-metadata`). Both apps call it once at module
load and delegate to the returned `OrderAppService`.

### DynamoDB single-table design

| Access pattern | Operation | Keys |
|----------------|-----------|------|
| Get order by id | `GetItem` | `PK = ORDER#<id>`, `SK = #META` |
| Get audit trail | `Query` | `PK = ORDER#<id>`, `SK begins_with AUDIT#` |
| List all orders | `Query GSI1` | `GSI1PK = ORDERS`, `GSI1SK = <createdAt>#<id>` |

---

## Key Decisions

16 ADRs live in [`docs/adr/`](./docs/adr/README.md). Summary:

| ADR | Decision | Why |
|-----|----------|-----|
| 0002 | Hono on Lambda | Minimal cold-start weight; first-class `hono/aws-lambda` adapter |
| 0003 | Manual composition root | 4 use cases, 6 ports — a DI framework adds indirection for nothing |
| 0004 | Hexagonal layering | Domain free of framework imports; adapters swap without domain changes |
| 0005 | DynamoDB single-table + GSI1 | Serverless-native; access patterns designed up-front; "list all" via constant GSI partition |
| 0006 | SQS standard + DLQ | Pull/buffer/retry; single consumer; EventBridge when fan-out is needed |
| 0009 | Explicit audit handler | No DynamoDB Streams; every transition explicitly calls `RecordAuditEntryHandler` — observable, testable |
| 0010 | Combined local runtime | In-memory queue can't bridge two OS processes; locally API + worker share one process |
| 0012 | Zod contracts as source of truth | One schema → validation + TypeScript types + OpenAPI spec; no schema drift |
| 0013 | `PaymentGatewayPort` for FAILED | `FAILED` is a business outcome (gateway declines); DLQ is an infra failure — they are distinct |
| 0016 | Per-adapter env flags | `USE_AWS_SQS` / `USE_AWS_DYNAMO` in `composeOrders(env)`; local↔AWS is an env change, not code |

---

## AWS Deployment Scenario

**Compute:** Lambda for API and worker — pay-per-use, scales to zero, horizontally elastic.
Trade-off vs Fargate: Fargate suits sustained load with no cold starts; order traffic is
spiky and event-driven, so Lambda wins. Cold-start mitigation: minimal Hono edge, `pnpm deploy`
extracts only the needed package, provisioned concurrency if latency SLAs tighten.

**API edge:** API Gateway **HTTP API** (lower cost and latency than REST API).
Production auth path: API GW **JWT Authorizer** backed by Cognito — no domain code changes needed.

**Data:** DynamoDB **on-demand** — no capacity planning, single-digit-ms reads. GSI1 enables
"list all" without a scan. Known hot-partition caveat at scale (constant `ORDERS` GSI key);
production remedy: sharded GSI partition (`ORDERS#<shard>`) + parallel queries.

**Messaging:** SQS standard queue with DLQ (`maxReceiveCount = 3`). Visibility timeout
must exceed worker processing time. CloudWatch alarm on DLQ depth. Standard (not FIFO)
because ordering and dedup aren't required; the idempotent consumer handles at-least-once.

**Frontend:** Astro static build deployed to **S3 + CloudFront** (HTTPS, global CDN). A CloudFront
Function rewrites directory-style URLs (`/customer` → `/customer/index.html`) for Astro's
directory output format. CloudFront handles `403`/`404` errors with a fallback to `index.html`.

**Security:** Mock JWT now → Cognito + API GW authorizer later.
`JWT_SECRET` moves to **Secrets Manager**; least-privilege IAM per Lambda (API: `PutItem/GetItem/Query`
on table + `sqs:SendMessage`; worker: `PutItem/GetItem` + `sqs:ReceiveMessage/DeleteMessage/GetQueueAttributes`).

**Observability:** Structured CloudWatch Logs per Lambda (explicit `LogGroup` constructs in CDK),
X-Ray tracing across API → SQS → worker, alarms on DLQ depth / Lambda errors / throttles.

---

## Scalability

- **DynamoDB on-demand** absorbs read/write spikes with no pre-warming.
- **SQS** decouples the API from worker speed — the API enqueues in milliseconds; the worker drains
  at its own concurrency. Backpressure is SQS-native.
- **Lambda** scales horizontally with reserved/limited concurrency to protect DynamoDB throughput.
- **Bottleneck:** the constant `ORDERS` GSI1 partition goes hot under very high list-all load.
  Remedy: sharded partition key (`ORDERS#<N>`) with scatter-gather, or a separate read-optimised
  table updated by EventBridge fan-out.
- **Evolution:** emit `OrderStatusChanged` to EventBridge for multi-subscriber fan-out (schema
  registry, content routing, replay) when more consumers appear.

---

## Possible Improvements

| Area | Improvement |
|------|-------------|
| Auth | Replace mock JWT with Cognito + API GW JWT Authorizer; `JWT_SECRET` → Secrets Manager |
| Data | Sharded GSI partition key for "list all" at scale; DynamoDB Accelerator (DAX) for read-heavy paths |
| Messaging | FIFO queue if ordering/dedup ever required; EventBridge for `OrderStatusChanged` fan-out |
| Observability | X-Ray traces; structured logging with correlation IDs; DLQ depth alarm |
| Testing | Contract/integration tests against LocalStack; mutation testing for domain state machine |
| Infra | VPC + endpoints for Lambdas in private subnets; WAF on API Gateway; CDK pipelines |
| Performance | Provisioned concurrency for the API Lambda; Lambda response streaming |
| Real gateway | Swap `FakePaymentGateway` for a real adapter (Stripe, Culqi) without domain changes |

---

## Execution Instructions

### Prerequisites

- Node.js ≥ 22, pnpm ≥ 9, Docker (for Option A)

### Option A — Docker Compose (recommended — full stack, real adapters)

Starts **floci** (local AWS emulator), bootstraps the DynamoDB table + SQS queue, then runs
`orders-api` and `orders-worker` as separate containers with real SQS/DynamoDB adapters.

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd tcs-challenge-for-backend

# 2. Create .env.docker at the repo root (gitignored; values below are for local dev only)
cat > .env.docker <<'EOF'
USE_AWS_DYNAMO=true
USE_AWS_SQS=true
DDB_ENDPOINT=http://floci:4566
QUEUE_URL=http://floci:4566/000000000000/orders-queue
ORDERS_TABLE=orders
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
JWT_SECRET=local-dev-secret
FAIL_ABOVE_AMOUNT=10000
PORT=3000
EOF

# 3. Start the full stack
docker compose up --build
```

Services start in dependency order: floci → bootstrap (table + queue) → orders-api + orders-worker.

| Port | Service |
|------|---------|
| `3000` | orders-api |
| `4500` | Floci UI — browser-based DynamoDB + SQS inspector |
| `4566` | Floci AWS emulator endpoint (internal) |

> **Async behaviour in Docker mode:** `POST /orders/:id/process` enqueues a message to SQS; the
> worker container picks it up and processes it independently. The final status (`COMPLETED` or
> `FAILED`) is visible via `GET /orders/:id` once the worker has drained the message (usually
> within a second).

### Option B — In-process dev (no Docker)

Runs the combined local runtime: the Hono HTTP server and the worker poll-loop run in **the same
Node.js process**, sharing an in-memory queue. No external services are required. Because the
queue is in-process, `POST /orders/:id/process` completes synchronously — the order's final
status is available immediately in the `202` response.

```bash
# 1. Install dependencies
pnpm install

# 2. Create a local .env file
cp .env.example .env
# Edit .env: USE_AWS_DYNAMO=false, USE_AWS_SQS=false, JWT_SECRET=local-dev-secret, FAIL_ABOVE_AMOUNT=10000

# 3. Start the API + worker combined runtime
pnpm --filter @tcs-challenge-for-backend/orders-api dev
```

API is available at `http://localhost:3000`.

### Running the tests

```bash
pnpm test          # all test suites across the monorepo
pnpm typecheck     # TypeScript type-check across all packages
pnpm lint          # ESLint (typescript-eslint flat config)
```

Tests cover the domain (state machine, value objects), all application handlers (create, process,
audit, list, get), infrastructure adapters (DynamoDB repositories, SQS publisher, fake gateway),
and the composition root (`composeOrders`).

---

## API Usage

### 1. Get the demo JWT

A pre-signed token is included in `.env.example` (signed with `JWT_SECRET=change-me-in-local-only`):

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJleHAiOjE4MTM0NDk2MDB9.q_gVK7c1pQMVWifUK4CEYIv_E4Wct-F_Jwx084_hby4
```

Use this header in all `/orders*` calls.

### 2. Create an order

```bash
curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-123","amount":500,"currency":"USD"}' | jq
# → 201 { id, status: "PENDING", customerId, amount, currency, createdAt, updatedAt }
```

### 3. Query an order

```bash
curl -s http://localhost:3000/orders/<id> \
  -H "Authorization: Bearer <token>" | jq
# → 200 OrderResponse  |  404 if not found
```

### 4. Check the audit trail

```bash
curl -s http://localhost:3000/orders/<id>/audit \
  -H "Authorization: Bearer <token>" | jq
# → 200 AuditEntry[]
```

Each entry contains: `orderId`, `event`, `previousState`, `newState`, `timestamp`, and an
optional `reason` (present on `ORDER_FAILED` entries).

Full lifecycle events in order: `ORDER_CREATED` → `ORDER_PROCESSING_STARTED` → `ORDER_COMPLETED`
(or `ORDER_FAILED`).

### 5. Trigger processing

```bash
curl -s -X POST http://localhost:3000/orders/<id>/process \
  -H "Authorization: Bearer <token>" | jq
# → 202 { id, status }
# The worker transitions the order: PENDING → PROCESSING → COMPLETED (or FAILED)
```

> **To produce a FAILED order:** create one with `amount > 10000` (the `FAIL_ABOVE_AMOUNT` threshold).
> The `FakePaymentGateway` declines it and the worker transitions it to `FAILED`.

### 6. List all orders (backoffice)

```bash
curl -s http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" | jq
# → 200 OrderResponse[]
```

### 7. Health check (no auth)

```bash
curl -s http://localhost:3000/health
# → 200 { status: "ok" }
```

### Error envelope

All errors follow `{ "error": { "code": "...", "message": "..." } }`.

| Scenario | HTTP code |
|----------|-----------|
| Invalid or missing body field | `422` |
| Missing / invalid Bearer token | `401` |
| Order not found | `404` |
| Illegal state transition | `409` |

---

## Monorepo Layout

| Path | Purpose |
|------|---------|
| `apps/orders-api` | Hono HTTP edge (Lambda + local server) |
| `apps/orders-worker` | Async SQS consumer / local poll-loop |
| `apps/api-docs` | OpenAPI 3.1 spec (Zod → zod-to-openapi) + Scalar UI |
| `apps/web` | Astro + Tailwind + DaisyUI — Landing, Customer (create/look up), Backoffice (orders table) |
| `apps/iac` | AWS CDK stack (DynamoDB, SQS + DLQ, Lambdas, HTTP APIs, S3 + CloudFront, IAM) |
| `core/orders` | Hexagonal core: domain, application, infrastructure, composition root |
| `core/contracts` | Zod schemas + inferred DTOs (single source of truth) |
| `core/kernel` | Result/error types, id/clock abstractions |

## Documentation Map

| Document | Content |
|----------|---------|
| [`docs/design.md`](./docs/design.md) | Full narrative design: layers, handlers, DynamoDB model, AWS scenario, scalability |
| [`docs/aws-infra.md`](./docs/aws-infra.md) | AWS infrastructure diagram: topology, IAM grants, sequence flows, DynamoDB key schema, CFN outputs |
| [`docs/c4.md`](./docs/c4.md) | C4 model — context, container, component diagrams |
| [`docs/adr/`](./docs/adr/README.md) | 16 Architecture Decision Records with options and trade-offs |
| [`openspec/changes/`](./openspec/changes/) | Feature change log: proposal → design → specs → tasks (archived per feature) |
