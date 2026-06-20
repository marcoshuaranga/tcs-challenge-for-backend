# ADR-0014: Minor decisions log

**Status:** Accepted · **Date:** 2026-06-19 · **Deciders:** Solution author

Smaller decisions that don't each warrant a full ADR but should be recorded.

| #   | Decision                                                                 | Rationale                                                                                                                       |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Lightly-signed JWT (HMAC + env secret) bearer middleware in `orders-api` | Mock allowed; verifies signature + `exp`. Mint helper `pnpm token`. No separate auth service.                                   |
| M2  | Frontend ships a static demo JWT                                         | `web` stays public/no-login while the API guard is still satisfied.                                                             |
| M3  | API Gateway HTTP API (not REST API)                                      | Lower cost/latency; JWT authorizer available for the prod path.                                                                 |
| M4  | DaisyUI on Tailwind for `web`                                            | Pure-CSS components, zero client JS, good table for backoffice; fits Astro static output. shadcn/ui is the heavier alternative. |
| M5  | Scalar renderer for `api-docs`                                           | Clean OpenAPI UI; Redoc is the fallback.                                                                                        |
| M6  | Idempotent consumer (no-op if order not processable)                     | SQS at-least-once delivery.                                                                                                     |
| M7  | Single explanatory doc, not a separate system-design doc                 | Brief grades code + one clear doc + commits; a second overlapping doc reads as padding.                                         |
