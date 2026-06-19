# CLAUDE.md — Agent operating rules

> Read every session. This is the **rules digest** — the durable architecture guardrails.
> Deep reasoning lives in `docs/design.md` and `docs/adr/`. The build runs **feature-driven via
> OpenSpec** (`openspec/`): each feature is a change with proposal → design → specs → tasks.
> Active change and task progress live in `openspec/changes/<name>/tasks.md`.

## What we are building

An order-processing platform for the TCS technical challenge. Orders are registered, then
processed **asynchronously** through a state machine, with an audit trail for every transition.
Scope is small (5 user stories); grading rewards reasoning, decision quality, AWS thinking, and
**commit history**. Do not over-build.

## Package manager: pnpm (not npm/yarn)

- Install deps with `pnpm install`. Run scripts with `pnpm --filter <pkg> <script>` or `pnpm -r run <script>`.
- One-off tools via `pnpm dlx ...`. Uses pnpm workspaces (ADR-0001).
- Never generate `package-lock.json` or `yarn.lock`; only `pnpm-lock.yaml` is committed.

## Stack (do not substitute without an ADR)

- **pnpm workspaces** monorepo, TypeScript (ADR-0001).
- **No application framework.** Wiring is a **manual composition root**: `composeOrders(env)` in
  `core/orders/src/index.ts` builds adapters + handlers and returns `OrderAppService`. Each app calls
  it at module load. Adapters chosen by **per-adapter env flags** (`USE_AWS_SQS`, `USE_AWS_DYNAMO`)
  — see ADR-0003 / ADR-0016. No application framework, no DI container, no `reflect-metadata`.
- **Hono** is the HTTP edge (`hono/aws-lambda` on AWS, `@hono/node-server` locally).
- **DynamoDB** via **dynamodb-toolbox** (single table + GSI1).
- **SQS + DLQ** for the async work path; **in-memory** adapter for local.
- **Plain command/query handler classes**; `OrderAppService` delegates to them directly (no
  framework bus). Cross-process API→worker via the `MessagePublisherPort` (ADR-0007).
- **Zod** in `core/contracts` = single source of truth (validation via `@hono/standard-validator`,
  OpenAPI via `zod-to-openapi`, types via inference).
- **AWS CDK** (TS) for IaC. **Astro + Tailwind + DaisyUI** for the public frontend.

## Tooling: ESLint + Prettier (ADR-0015)

- **Prettier** owns formatting workspace-wide. Run `pnpm dlx prettier --write .` (or `--check` for CI).
- **ESLint** owns lint rules via `typescript-eslint`. Run `pnpm dlx eslint .`. Do not add Biome.
- Hexagonal layer ordering is enforced by code discipline and review, not by a lint rule (NX removed).
  `eslint.config.mjs` uses `typescript-eslint` flat config directly.

## Architecture rules (enforced — do not violate)

1. **Hexagonal dependency direction:** `domain` ← `application` ← `infrastructure`.
   `apps/*` depend on `core/*`; **core libs never import apps**.
2. **Domain is framework-free.** No Hono, AWS, DynamoDB, or I/O imports in `core/orders/src/domain`.
   Pure TypeScript only. (`application` and `infrastructure` are framework-free too.)
3. **Ports are plain interfaces in `application`; adapters live in `infrastructure`.** They are
   wired to ports inside `core/orders/src/index.ts` (`composeOrders`) — the only place that knows
   concrete adapters. No DI container; constructor injection by hand.
4. **No magic.** Every functional behavior must be explicit and unit-testable:
   - Audit is written by an **explicit `RecordAuditEntryHandler`** call on every state change.
     No DynamoDB Streams, no implicit listeners.
   - Orchestration is explicit: `CreateOrderHandler` publishes `ProcessOrderMessage` directly
     (no event-bus saga).
5. **State machine is authoritative.** `PENDING -> PROCESSING -> COMPLETED | FAILED`. Illegal
   transitions throw `InvalidStateTransitionError` (maps to HTTP 409).
6. **Idempotent worker.** SQS is at-least-once: `ProcessOrderHandler` no-ops if the order is not
   in a processable state.
7. **FAILED is produced by a port, not a hack.** The worker calls `PaymentGatewayPort.authorize`.
   The fake adapter declines when `amount > FAIL_ABOVE_AMOUNT`. `FAILED` (business outcome) is
   distinct from the **DLQ** (infra failure after `maxReceiveCount`).
8. **Adapter selection is by env flag, in one place.** `composeOrders(env)` reads typed config (not
   raw `process.env`) and picks in-memory vs AWS per `USE_AWS_SQS` / `USE_AWS_DYNAMO`. Adapters
   never read the flags themselves.

## Layout

```
apps/orders-api      Hono/Lambda edge -> composeOrders() -> OrderAppService
apps/orders-worker   SQS consumer (prod) / poll-loop (local) -> composeOrders()
apps/api-docs        OpenAPI from contracts, rendered with Scalar
apps/web             Astro + Tailwind + DaisyUI, 3 public pages, static demo JWT
apps/iac             AWS CDK stack
core/orders              Single package (@tcs-challenge-for-backend/orders). Internal layers:
  src/index.ts         composeOrders(env) — public entry point, wires adapters+handlers
  src/domain/          Order aggregate, value objects, state machine (pure TS)
  src/application/     OrderAppService, command/query handlers, ports (pure TS)
  src/infrastructure/  dynamodb-toolbox repos, SQS + in-memory adapters, fake gateway (pure TS)
core/kernel          Result/error types, ids, clock
core/contracts              Zod schemas + inferred DTOs
```

## How the build runs (OpenSpec, feature-driven)

- Built **feature by feature** via OpenSpec. Each feature is an OpenSpec change under
  `openspec/changes/<name>/`. Run `/opsx:propose` to plan, `/opsx:apply` to implement,
  `/opsx:archive` to close. Feature scope in `docs/design.md` §6 (user-story traceability table).
- **All commits land directly on `main`. No PRs, no branches.** Keep commits small and
  **conventional** (`feat(domain): ...`, `feat(infra): ...`). The linear `main` log is the graded artifact.
- Session continuity comes from `openspec/changes/<name>/tasks.md` — checkboxes track what's done.
  Archive the change with `/opsx:archive` when a full feature is done.
- Architecture is pre-decided in `docs/adr/`. Do not re-litigate decisions; if something is
  ambiguous, prefer the ADRs and raise it rather than inventing infrastructure.
- XP practices apply: TDD (Red → Green → `/simplify` → lint → commit), YAGNI (scope to current
  feature), Simple Design (no abstraction without 3 concrete cases). The REFACTOR step is always
  a `/simplify` or `/code-review` run — never ad-hoc — so quality is verified, not assumed.
- Never commit `.env` or lockfiles other than `pnpm-lock.yaml`.
- Tests matter for domain + handlers (state machine, transition guards, idempotency, audit on
  every transition, payment decline path). Full coverage is NOT required.
- Do not add CI/CD or production hardening; out of scope per the brief.

## Environment

See `.env.example`: `USE_AWS_SQS`, `USE_AWS_DYNAMO`, `JWT_SECRET`, `FAIL_ABOVE_AMOUNT`,
`ORDERS_TABLE`, `QUEUE_URL`, `DDB_ENDPOINT`, `AWS_REGION`, `PORT`.
