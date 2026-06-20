## Why

Running the full platform locally requires spinning up DynamoDB Local and coordinating
three separate processes (API, worker, DynamoDB). Without a compose file, each developer
must manually start services in the right order, set env vars by hand, and keep ports
consistent — a friction point that slows iteration.

## What Changes

- Add a `docker-compose.yml` at the repo root that starts the full local stack:
  DynamoDB Local, `orders-api`, and `orders-worker`.
- Add `Dockerfile`s for `apps/orders-api` and `apps/orders-worker` (multi-stage, production-ish build).
- Add a `scripts/bootstrap-dynamo.ts` (or shell) script that creates the DynamoDB table and
  GSI on first run, so compose is self-contained.
- Provide a `.env.docker` example with all vars wired for the compose network.

## Capabilities

### New Capabilities

- `local-docker-compose`: Docker Compose stack (DynamoDB Local + orders-api + orders-worker)
  with automatic table bootstrap, ready to `docker compose up` from the repo root.

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- New files: `docker-compose.yml`, `apps/orders-api/Dockerfile`,
  `apps/orders-worker/Dockerfile`, `scripts/bootstrap-dynamo.ts`, `.env.docker`.
- No changes to application code or existing specs.
- No new npm/pnpm dependencies required (bootstrap script uses the AWS SDK already
  present in the infra layer; alternatively a plain `aws-cli` call inside the compose
  init container avoids any new deps).
- Non-Goals: CI/CD integration, production Docker images, multi-env promotion, hot-reload
  inside containers.
