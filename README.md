# Order Processing Platform — TCS Technical Challenge

> Node.js · TypeScript · Hexagonal Architecture · AWS Serverless · pnpm Workspaces

Registers orders, processes them **asynchronously** through a guarded state machine, and keeps an
immutable audit trail for every state transition.

**All 5 required user stories are implemented. All 4 bonus deliverables are included.**

→ **[Challenge specification](./CHALLENGE.md)**

## Live deployment (AWS `us-east-1`)

| Service                  | URL                                                    |
| ------------------------ | ------------------------------------------------------ |
| **Orders API**           | https://cnsy7jghla.execute-api.us-east-1.amazonaws.com |
| **API Docs (Scalar UI)** | https://w8n051olwe.execute-api.us-east-1.amazonaws.com |
| **Web frontend**         | https://dg4qdfp7unzl8.cloudfront.net                   |

## Architecture

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

## Quick start

**Prerequisites:** Node.js ≥ 22, pnpm ≥ 11, Docker

Starts **Floci** ([floci/floci](https://github.com/floci/floci) — a LocalStack-compatible local AWS
emulator), bootstraps DynamoDB + SQS, and runs the API and worker as separate containers.
All env vars are baked into `compose.yml` — no extra config needed.

```bash
git clone https://github.com/marcoshuaranga/tcs-challenge-for-backend.git && cd tcs-challenge-for-backend
docker compose up --build
```

| Port   | Service                                            |
| ------ | -------------------------------------------------- |
| `3000` | orders-api                                         |
| `4500` | Floci UI — browser-based DynamoDB + SQS inspector  |
| `4566` | Floci AWS endpoint (also accessible from the host) |

Processing is async: `POST /orders/:id/process` enqueues to SQS; the worker picks it up
independently and the final status appears in `GET /orders/:id` within a second.

> `apps/api-docs` (Scalar UI) is not in the Compose stack — use the live URL above or run
> `pnpm --filter @tcs-challenge-for-backend/api-docs dev` separately.

### Scripts

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `pnpm test`      | Run all test suites across the monorepo |
| `pnpm typecheck` | TypeScript type-check all packages      |
| `pnpm lint`      | ESLint (typescript-eslint flat config)  |

## API

More examples here: [Full API reference (all endpoints, error codes)](./docs/api-reference.md)

Demo JWT (from `.env.example`):

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJleHAiOjE4MTM0NDk2MDB9.q_gVK7c1pQMVWifUK4CEYIv_E4Wct-F_Jwx084_hby4
```

```bash
# Create
curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-1","amount":500,"currency":"USD"}' | jq

# Get
curl -s http://localhost:3000/orders/<id> -H "Authorization: Bearer <token>" | jq

# Process (amount > 10000 → FAILED)
curl -s -X POST http://localhost:3000/orders/<id>/process -H "Authorization: Bearer <token>" | jq
```

## User story coverage

| #   | HU                  | Endpoint / Mechanism                        | Notes                                                                          |
| --- | ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Registrar orden     | `POST /orders`                              | Validates body (Zod), persists as `PENDING`, returns `201`                     |
| 2   | Consultar orden     | `GET /orders/:id` · `GET /orders/:id/audit` | `404` if not found; full audit trail on `/audit`                               |
| 3   | Procesar orden      | `POST /orders/:id/process` → queue → worker | Async; guarded state machine; idempotent consumer                              |
| 4   | Registrar auditoría | Explicit handler on every transition        | `ORDER_CREATED`, `ORDER_PROCESSING_STARTED`, `ORDER_COMPLETED`, `ORDER_FAILED` |
| 5   | Seguridad básica    | Bearer JWT middleware on `/orders*`         | HMAC-signed token (HS256); `401` on missing/invalid                            |

### Bonus deliverables

| Bonus               | What was built                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------- |
| OpenAPI / Swagger   | `apps/api-docs` — Hono + Scalar UI; Zod schemas compiled to OpenAPI 3.1 via `zod-to-openapi` |
| Front básico        | `apps/web` — Astro + Tailwind + DaisyUI; Landing, Customer, Backoffice pages                 |
| IaC básico          | `apps/iac` — AWS CDK stack: DynamoDB, SQS + DLQ, Lambdas, HTTP APIs, S3 + CloudFront         |
| Despliegue real AWS | CDK stack deployed to `us-east-1` — all three services live (URLs above)                     |

## Docs

| Document                                         | Content                                                        |
| ------------------------------------------------ | -------------------------------------------------------------- |
| [docs/api-reference.md](./docs/api-reference.md) | All endpoints, error envelope                                  |
| [docs/design.md](./docs/design.md)               | Full narrative design, state machine, handlers, DynamoDB model |
| [docs/aws-infra.md](./docs/aws-infra.md)         | AWS topology, IAM grants, CDK outputs                          |
| [docs/c4.md](./docs/c4.md)                       | C4 context, container, component diagrams                      |
| [docs/adr/](./docs/adr/README.md)                | 16 Architecture Decision Records                               |
