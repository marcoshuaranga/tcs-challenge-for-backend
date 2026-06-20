# Spec: local-docker-compose

## Purpose

Defines requirements for the local Docker Compose stack that allows developers to run the full
backend (DynamoDB Local, ElasticMQ, orders-api, orders-worker) with a single command and no
manual configuration.

---

## Requirements

### Requirement: Single-command local stack startup

The system SHALL provide a `docker-compose.yml` at the repo root that starts all backend
services (DynamoDB Local, ElasticMQ, orders-api, orders-worker) with `docker compose up`.
No manual env-var exports or service-start ordering SHALL be required from the operator.

#### Scenario: All services start with one command

- **WHEN** the operator runs `docker compose up` from the repo root
- **THEN** DynamoDB Local, ElasticMQ, bootstrap, orders-api, and orders-worker all start
  in the correct dependency order and reach a healthy state

#### Scenario: API is reachable after compose up

- **WHEN** all services have started
- **THEN** `GET http://localhost:3000/health` returns HTTP 200

---

### Requirement: Automatic infrastructure bootstrap

The compose stack SHALL include a bootstrap service that creates the DynamoDB table
(with GSI1) and the SQS queue before the API and worker start, so no manual AWS CLI
commands are required on first run.

#### Scenario: DynamoDB table is created on first boot

- **WHEN** the bootstrap service runs
- **THEN** the `orders` table with the `GSI1` global secondary index exists in DynamoDB Local

#### Scenario: SQS queue is created on first boot

- **WHEN** the bootstrap service runs
- **THEN** the `orders-queue` queue exists in ElasticMQ

#### Scenario: API and worker do not start before bootstrap completes

- **WHEN** the bootstrap service exits with success
- **THEN** orders-api and orders-worker containers start; they do not start before bootstrap

---

### Requirement: Cross-container order processing

The orders-api and orders-worker containers SHALL communicate through ElasticMQ (SQS
adapter) so that an order created via the API is asynchronously processed by the worker.

#### Scenario: Order flows from API to worker

- **WHEN** a POST to `/orders` succeeds and the worker is running
- **THEN** the order transitions from PENDING to PROCESSING to COMPLETED (or FAILED)
  without any operator intervention

---

### Requirement: Pre-configured docker environment file

A `.env.docker` file SHALL be provided at the repo root with all environment variables
pre-set for the compose network (DDB_ENDPOINT pointing to `dynamodb-local:8000`,
QUEUE_URL pointing to ElasticMQ, USE_AWS_DYNAMO=true, USE_AWS_SQS=true, etc.), so
the operator can start the stack without editing any config.

#### Scenario: Stack starts with .env.docker defaults

- **WHEN** the operator runs `docker compose up` without modifying `.env.docker`
- **THEN** all services start correctly and can process orders end-to-end

---

### Requirement: App images built from monorepo Dockerfiles

Each app (orders-api, orders-worker) SHALL have a multi-stage `Dockerfile` that uses
`pnpm deploy` to extract a self-contained deployable directory, keeping image size
minimal by not shipping the full monorepo into each container.

#### Scenario: Dockerfile builds successfully from repo root

- **WHEN** `docker build -f apps/orders-api/Dockerfile .` is run from the repo root
- **THEN** the build completes without error and produces a runnable image

#### Scenario: Worker image builds successfully from repo root

- **WHEN** `docker build -f apps/orders-worker/Dockerfile .` is run from the repo root
- **THEN** the build completes without error and produces a runnable image
