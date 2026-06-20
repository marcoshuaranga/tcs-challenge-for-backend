## Purpose

Expose the OpenAPI 3.1 specification for the Orders API and render it via the Scalar UI,
generated from `core/contracts` Zod schemas using `zod-to-openapi`.

## Requirements

### Requirement: OpenAPI spec endpoint
The system SHALL expose `GET /openapi.json` from `apps/api-docs/` that returns an
OpenAPI 3.1 JSON document generated from `core/contracts` Zod schemas via `zod-to-openapi`.
The spec SHALL include all API paths defined in Features 1–4:
`POST /orders`, `POST /orders/:id/process`, `GET /orders/:id`,
`GET /orders/:id/audit`, `GET /orders`, `GET /health`.

#### Scenario: GET /openapi.json returns a valid OpenAPI document
- **WHEN** `GET /openapi.json` is called on the api-docs server
- **THEN** the response is `200` with `Content-Type: application/json` and a body
  containing `{ openapi: "3.1.0", info: { ... }, paths: { ... } }`

#### Scenario: Spec includes all order API paths
- **WHEN** the OpenAPI spec is generated
- **THEN** it contains path entries for `/orders`, `/orders/{id}`,
  `/orders/{id}/process`, `/orders/{id}/audit`, and `/health`

---

### Requirement: Scalar UI endpoint
The system SHALL expose `GET /` from `apps/api-docs/` that renders the Scalar API
reference UI, loading the spec from `/openapi.json`.

#### Scenario: GET / returns the Scalar UI HTML
- **WHEN** `GET /` is called on the api-docs server
- **THEN** the response is `200` with `Content-Type: text/html` and a body
  containing the Scalar UI HTML referencing `/openapi.json`
