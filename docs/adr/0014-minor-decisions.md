# ADR-0014: Minor decisions log

**Status:** Accepted · **Date:** 2026-06-19 · **Deciders:** Solution author

Smaller decisions that don't each warrant a full ADR but should be recorded.

| #   | Decision                                                                 | Rationale                                                                                                                       |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Lightly-signed JWT (HMAC + env secret) bearer middleware in `orders-api` | Mock allowed; verifies signature + `exp`. A pre-signed demo token is included in `.env.example` (`DEMO_JWT`). No separate auth service. |
| M2  | Frontend ships a static demo JWT                                         | `web` stays public/no-login while the API guard is still satisfied.                                                             |
| M3  | API Gateway HTTP API (not REST API)                                      | Lower cost/latency; JWT authorizer available for the prod path.                                                                 |
| M4  | DaisyUI on Tailwind for `web`                                            | Pure-CSS components, zero client JS, good table for backoffice; fits Astro static output. shadcn/ui is the heavier alternative. |
| M5  | Scalar renderer for `api-docs`                                           | Clean OpenAPI UI; Redoc is the fallback.                                                                                        |
| M6  | Worker throws `InvalidStateTransitionError` (→ 409) if order not `PENDING` | SQS at-least-once delivery; a non-PENDING order on redelivery is an illegal transition, not a silent no-op — surfaces as a business error distinct from infra retries → DLQ. |
| M7  | Single explanatory doc, not a separate system-design doc                 | Brief grades code + one clear doc + commits; a second overlapping doc reads as padding.                                         |
