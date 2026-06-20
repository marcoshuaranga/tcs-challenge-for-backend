## Context

The project runs two apps (orders-api, orders-worker) plus DynamoDB as persistence. In local
development today, each must be started manually with the right env vars. There is no way to
start the full platform in one command.

A second problem: the in-process `InMemoryMessagePublisher` cannot bridge two OS processes —
when the API and worker run as separate Node.js processes without SQS, the worker's poll-loop
drains from an empty queue and orders are never processed. The compose setup must wire both
apps through a real (local) queue.

## Goals / Non-Goals

**Goals:**
- `docker compose up` starts the full platform (DynamoDB Local, API, worker) in one command.
- API → worker messaging works across containers (real SQS adapter path).
- DynamoDB table + SQS queue are created automatically on first boot.
- No changes to application code; only new infra files.

**Non-Goals:**
- Hot-reload inside containers (source mounts / tsx watch).
- api-docs or web containers (no backend dependency, can be run with `pnpm dev` separately).
- Production image hardening (non-root user, distroless base, image scanning).
- CI/CD integration.

## Decisions

### D1: Use ElasticMQ for local SQS, not LocalStack

ElasticMQ is a standalone SQS-compatible server (~50 MB JVM jar, official Docker image
`softwaremill/elasticmq-native`). It speaks the AWS SQS API, so the existing
`SqsMessagePublisher` and the worker's SQS consumer work unchanged by pointing `QUEUE_URL`
at the ElasticMQ endpoint.

**Alternative considered:** LocalStack — full AWS emulation (DynamoDB + SQS + more in one
container). Rejected because it is significantly heavier, takes longer to start, and we only
need DynamoDB and SQS locally. Two purpose-built images (DynamoDB Local + ElasticMQ) start
faster and have simpler configs.

**Alternative considered:** Keep `USE_AWS_SQS=false` (in-memory) — works only within a single
OS process. The API and worker are separate containers, so the in-memory publisher cannot
bridge them. Rejected.

### D2: Bootstrap via AWS CLI init container, not a Node.js script

A Docker `init` container using `amazon/aws-cli` calls the DynamoDB `create-table` and SQS
`create-queue` APIs before the API and worker start. This avoids adding a new Node.js
entry-point or script, and uses tooling that operators recognize.

The init container runs with `command: ["bash", "-c", "<aws cli commands>"]` and the API/worker
use `depends_on: { bootstrap: { condition: service_completed_successfully } }` to wait.

**Alternative considered:** A `scripts/bootstrap-dynamo.ts` Node.js script in a custom image —
more portable (no bash), but adds a bespoke script + image to maintain. Rejected for YAGNI.

### D3: Monorepo Dockerfiles use `pnpm deploy` to extract a self-contained app

`pnpm deploy --filter=<pkg> /deploy/<pkg>` copies the package and all its workspace
dependencies into a flat directory with a resolved `node_modules`. The Dockerfile then copies
only that directory into the final image, keeping image size small and avoiding shipping the
full monorepo into each container.

Build stage: `node:22-alpine` + `pnpm deploy`. Runtime stage: `node:22-alpine` + the deployed
directory. `tsx` is a dev-dependency of each app, so `pnpm deploy` (without `--prod`) is used
to include it.

**Alternative considered:** Copy the entire workspace into a single image — simpler Dockerfile,
but each image is hundreds of MB larger and packages bleed across apps. Rejected.

### D4: Both apps run with `USE_AWS_DYNAMO=true` and `USE_AWS_SQS=true` in compose

This exercises the real infrastructure adapters and is the only config that correctly wires
API → (SQS) → worker across containers. The `.env.docker` file provides all required vars
pre-set for the compose network (e.g. `DDB_ENDPOINT=http://dynamodb-local:8000`).

## Risks / Trade-offs

- [ElasticMQ SQS compat] ElasticMQ does not implement all SQS features (no FIFO queues, no
  message attributes beyond basic). → Mitigation: The codebase only uses `SendMessage` and
  `ReceiveMessage`; both are fully supported.
- [pnpm deploy] `pnpm deploy` resolves symlinks; if a workspace package changes, Docker layer
  cache is busted for that app's image. → Mitigation: acceptable for local dev; use BuildKit
  cache mounts if build time becomes a problem.
- [tsx at runtime] tsx is a dev-dependency used as the runtime. If it is ever moved to
  `devDependencies` of a dep, deploy without `--prod` still includes it. → Mitigation: note in
  `.env.docker` that this is local-only; do not use these Dockerfiles for production.
- [DynamoDB Local port] DynamoDB Local listens on port 8000 inside the container; if the host
  already uses port 8000, `docker compose up` will fail. → Mitigation: map to a less common
  host port (e.g. 8001) in `ports:`.

## Open Questions

_(none — scope is fully defined)_
