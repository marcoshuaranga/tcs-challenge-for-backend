# ADR-0012: Contracts as single source of truth (Zod → OpenAPI)

**Status:** Accepted · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

`@hono/standard-validator` validates but emits no OpenAPI; we still want a Swagger/OpenAPI
deliverable.

## Decision

Define request/response schemas once in `core/contracts` using Zod (Zod satisfies Standard
Schema, so `standard-validator` consumes it directly). Generate `openapi.json` from the same
schemas via `zod-to-openapi`; render in `api-docs` with Scalar. `web` imports inferred types.

## Options Considered

- **Zod + standard-validator + zod-to-openapi (chosen)** — one source; keeps the chosen validator.
- **`@hono/zod-openapi` (OpenAPIHono)** — fuses validation + spec but replaces standard-validator.
- **Valibot** — valid for validation, less turnkey for OpenAPI generation.

## Trade-off Analysis

Single-source Zod keeps validation, types, and docs from drifting while preserving the requested
validator.

## Consequences

- Validation, types, and docs never diverge.

## Action Items

1. [ ] Schema registry in `contracts`; generation script in `api-docs`.
