## 1. Environment file

- [ ] 1.1 Create `.env.docker` at repo root with all vars set for the compose network:
  `USE_AWS_DYNAMO=true`, `USE_AWS_SQS=true`, `DDB_ENDPOINT=http://dynamodb-local:8000`,
  `QUEUE_URL=http://elasticmq:9324/000000000000/orders-queue`,
  `ORDERS_TABLE=orders`, `AWS_REGION=us-east-1`, `JWT_SECRET=local-dev-secret`,
  `FAIL_ABOVE_AMOUNT=10000`, `PORT=3000`

## 2. Dockerfiles

- [ ] 2.1 Write `apps/orders-api/Dockerfile` — multi-stage: builder uses `node:22-alpine`,
  copies full monorepo source, runs `pnpm install --frozen-lockfile` then
  `pnpm deploy --filter=@tcs-challenge-for-backend/orders-api /deploy/orders-api`;
  runtime stage copies `/deploy/orders-api` and runs `node --import tsx/esm src/index.ts`
- [ ] 2.2 Write `apps/orders-worker/Dockerfile` — same pattern as API Dockerfile but for
  `@tcs-challenge-for-backend/orders-worker`

## 3. Docker Compose

- [ ] 3.1 Write `docker-compose.yml` at repo root with five services:
  - `dynamodb-local` — `amazon/dynamodb-local:2`, port `8001:8000`
  - `elasticmq` — `softwaremill/elasticmq-native`, port `9324:9324`
  - `bootstrap` — `amazon/aws-cli`, runs `aws dynamodb create-table` (PK/SK + GSI1) and
    `aws sqs create-queue` pointing at dynamodb-local and elasticmq, then exits
  - `orders-api` — built from `apps/orders-api/Dockerfile`, `env_file: .env.docker`,
    port `3000:3000`, `depends_on: { bootstrap: { condition: service_completed_successfully } }`
  - `orders-worker` — built from `apps/orders-worker/Dockerfile`, `env_file: .env.docker`,
    `depends_on: { bootstrap: { condition: service_completed_successfully } }`
- [ ] 3.2 Add `healthcheck` to `dynamodb-local` and `elasticmq` services so the bootstrap
  service waits for them before running (`depends_on` with `condition: service_healthy`)

## 4. Smoke test

- [ ] 4.1 Run `docker compose up --build` and verify all services start without errors
- [ ] 4.2 POST an order to `http://localhost:3000/orders` and verify it transitions to
  COMPLETED (or FAILED for amount > 10000) by polling `GET /orders/:id`
- [ ] 4.3 Commit: `chore(docker): add local docker-compose stack with DynamoDB Local and ElasticMQ`
