## ADDED Requirements

### Requirement: Backoffice page — orders table
The system SHALL provide an Astro backoffice page at `/backoffice` in `apps/web/` that
on load calls `GET /orders` with the Bearer demo JWT and renders all returned orders in
a DaisyUI table with columns: `id`, `status`, `customerId`, `amount`, `currency`,
`createdAt`. The table SHALL display an empty-state message when no orders exist.

#### Scenario: Orders exist — table is populated
- **WHEN** the backoffice page loads and `GET /orders` returns a non-empty array
- **THEN** the page renders a table row for each order with the expected column values

#### Scenario: No orders — empty-state message is shown
- **WHEN** the backoffice page loads and `GET /orders` returns `[]`
- **THEN** the page renders an empty-state message instead of a table

#### Scenario: API error — error message is shown
- **WHEN** `GET /orders` returns a non-2xx response
- **THEN** the page renders an error message with the response detail
