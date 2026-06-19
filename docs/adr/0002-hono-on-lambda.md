# ADR-0002: Hono on Lambda as the HTTP entrypoint

**Status:** Proposed · **Date:** 2026-06-19 · **Deciders:** Solution author

## Context

Need an HTTP API on serverless AWS with type-safe validation and minimal cold-start weight.

## Decision

`orders-api` is a Hono app served via `hono/aws-lambda`, with `@hono/standard-validator` for
body validation. Locally served via `@hono/node-server`.

## Options Considered

| Dimension            | Hono                                  | Fastify     | Express       |
| -------------------- | ------------------------------------- | ----------- | ------------- |
| Cold-start footprint | Very small                            | Small       | Small         |
| Lambda fit           | First-class (`hono/aws-lambda`)       | Via adapter | Needs adapter |
| Type-safe validation | `standard-validator` + inferred types | Schemas     | Manual        |
| OpenAPI              | Via contracts (ADR-0012)              | Plugin      | Manual        |

## Trade-off Analysis

Hono is the thinnest, fastest HTTP/Lambda edge with first-class type-safe validation; Fastify and
Express are heavier or need an adapter and add no benefit here. The business logic sits behind the
edge in a manual composition root (`composeOrders`, ADR-0003), so the HTTP layer stays minimal.

## Consequences

- Small handler, fast cold start.
- A thin seam: the handler calls `composeOrders()` once and passes the facade to Hono.

## Action Items

1. [ ] Initialize `composeOrders()` outside the Lambda handler for warm-invocation reuse.
