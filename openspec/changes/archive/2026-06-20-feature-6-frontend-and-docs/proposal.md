## Why

The platform has a complete API but no human-facing entry points: no OpenAPI documentation
for integrators and no web UI for customers or backoffice operators to interact with orders
without writing raw HTTP calls. Feature 6 adds both in one pass — `apps/api-docs/`
(OpenAPI + Scalar) and `apps/web/` (Astro + Tailwind + DaisyUI, 3 pages, static demo JWT).

## What Changes

- **New**: `apps/api-docs/` — Hono app that generates an OpenAPI 3.1 spec from
  `core/contracts` Zod schemas via `zod-to-openapi`; serves it at `/openapi.json`
  and renders Scalar UI at `/`.
- **New**: `apps/web/` — Astro + Tailwind + DaisyUI static site with 3 pages:
  Landing (system overview), Customer (create order + view status), Backoffice
  (list all orders). All API calls use a hardcoded static demo JWT from the env
  (`PUBLIC_DEMO_JWT`); no real login flow.
- **New dependency** in `apps/api-docs/`: `zod-to-openapi`, `@asteasolutions/zod-to-openapi`,
  `@scalar/hono-api-reference`.
- **New dependency** in `apps/web/`: `astro`, `@astrojs/tailwind`, `daisyui`.
- **Modified**: `core/contracts` schemas annotated with `zod-to-openapi` metadata
  (`.openapi(...)`) so the generator can produce named components.

## Capabilities

### New Capabilities

- `api-docs`: Serves `GET /openapi.json` (generated spec) and `GET /` (Scalar UI)
  from `apps/api-docs/`.
- `web-landing`: Astro landing page — system overview and links to Customer / Backoffice.
- `web-customer`: Astro customer page — form to create an order (POST /orders) and input
  to look up order status (GET /orders/:id), rendered with DaisyUI components.
- `web-backoffice`: Astro backoffice page — table listing all orders (GET /orders),
  rendered with DaisyUI; uses the static demo JWT.

### Modified Capabilities

<!-- none — existing API contract is unchanged; contracts schemas gain openapi annotations
     only (additive metadata, no behavior change) -->

## Impact

- Creates two new app packages: `apps/api-docs/` and `apps/web/`.
- Annotates schemas in `core/contracts/src/` with `.openapi(...)` metadata.
- No changes to `core/orders`, adapters, handlers, routes, or the worker.
- Adds `apps/api-docs` and `apps/web` to `pnpm-workspace.yaml`.

## Non-Goals

- Authentication on the web UI — static demo JWT only; no OAuth or login flow.
- Real-time updates on the web pages — static fetch on page load only.
- Hosting or CDN configuration — Feature 7 (IaC) concern.
- Full OpenAPI request/response validation — Zod validation is already in the API layer.
