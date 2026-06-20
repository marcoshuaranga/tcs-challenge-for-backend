## Context

The platform has a fully functional JSON API (Features 1–4) backed by in-memory adapters
(or AWS adapters after Feature 5). Feature 6 adds two new app packages:

- `apps/api-docs/` — a minimal Hono app that builds an OpenAPI 3.1 spec from the existing
  `core/contracts` Zod schemas and serves it via Scalar UI.
- `apps/web/` — a static Astro site with 3 pages that call the existing API using a
  hardcoded demo JWT; no new backend endpoints.

Neither app touches `core/orders`. The hexagonal boundary is respected: web pages call
the HTTP API; they do not import `core/orders` directly.

## Goals / Non-Goals

**Goals:**
- Generate an OpenAPI 3.1 spec from `core/contracts` Zod schemas using `zod-to-openapi`.
- Serve the spec at `/openapi.json` and Scalar UI at `/` from `apps/api-docs/`.
- Build Astro + Tailwind + DaisyUI pages: Landing, Customer, Backoffice.
- Customer page: create order form (POST /orders) + status lookup (GET /orders/:id).
- Backoffice page: orders table (GET /orders).
- All API calls use `DEMO_JWT` env var as the static Bearer token.

**Non-Goals:**
- Authentication, sessions, or OAuth — static demo JWT only.
- Real-time polling or WebSockets — single fetch on page load.
- Hosting / CDN config — Feature 7 (IaC) concern.
- Server-side rendering with dynamic API calls — Astro static output only.

## Decisions

### zod-to-openapi annotates contracts schemas in place

`core/contracts` schemas gain `.openapi({ ... })` metadata calls. The `zod-to-openapi`
`extendZodWithOpenApi()` call must run before any schema is defined — it is called at
the top of each schema file in `core/contracts/src/`.

Alternative: maintain a separate OpenAPI YAML file. Rejected — YAGNI; the Zod schemas
are the single source of truth (ADR-0001); duplicating them in YAML creates drift.

### apps/api-docs is a standalone Hono app, not part of orders-api

The docs app has a different lifecycle (static content, rarely changes) and a different
deployment target in Feature 7 (static file or separate Lambda). Keeping it separate
avoids coupling the API runtime to the docs build.

Alternative: add `/docs` route to `apps/orders-api`. Rejected — conflates runtime
concerns with static documentation; the Scalar bundle adds unnecessary weight to the API
Lambda.

### Astro in static output mode — fetch API calls from browser JS

`apps/web/` uses `output: 'static'`. Pages fetch the orders API from client-side
`<script>` tags at runtime. `DEMO_JWT` is injected as a `define:vars` prop so it is
embedded at build time (acceptable for a demo with no production secrets).

Alternative: Astro SSR (`output: 'server'`). Rejected — adds a server runtime for no
benefit; the only dynamic data comes from the orders API, which is already running
separately.

### One static demo JWT — no login flow

The brief explicitly scopes to a "static hardcoded demo JWT". This avoids building an
auth flow out of scope. The demo JWT is signed with `JWT_SECRET` at setup time and
committed as `DEMO_JWT` in `.env.example` (with a placeholder value).

Alternative: real login form. Rejected — out of scope per brief.

### No unit tests for Astro pages or Scalar setup

Astro pages are HTML templates with fetch calls — there is no logic to unit-test. The
quality gate for this feature is `pnpm run typecheck` (TypeScript) and a manual smoke
test of the dev server. The `api-docs` app is verified by checking that `/openapi.json`
returns a valid JSON object with the expected paths.

Alternative: Playwright end-to-end tests. Rejected — out of scope; would require a
running API server in CI, which is not configured.

## Risks / Trade-offs

- **DEMO_JWT embedded at build time**: the JWT is baked into the static HTML. Acceptable
  for the demo scope. Mitigation: document that this is a demo-only artifact; never
  use a production secret as `DEMO_JWT`.
- **OpenAPI spec accuracy depends on zod-to-openapi annotations**: missing `.openapi()`
  calls produce incomplete specs. Mitigation: verify `/openapi.json` includes all paths
  as part of the quality gate.

## Open Questions

None — scope is tightly bounded by the brief.
