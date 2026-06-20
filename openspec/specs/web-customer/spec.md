## Purpose

Provide the Astro customer page for `apps/web/` — a demo UI for creating orders and
looking up order status, using the Bearer demo JWT for authentication.

## Requirements

### Requirement: Customer page — create order form
The system SHALL provide an Astro customer page at `/customer` in `apps/web/` with a
DaisyUI form that accepts `customerId`, `amount`, and `currency`; on submit it SHALL
call `POST /orders` with the Bearer demo JWT and display the created order id and status.

#### Scenario: Successful order creation displays the order id
- **WHEN** the user fills in the form and submits valid data
- **THEN** the page calls `POST /orders` with `Authorization: Bearer <DEMO_JWT>`
  and displays the returned order `id` and `status: PENDING`

#### Scenario: API error is shown to the user
- **WHEN** the API returns a non-2xx response
- **THEN** the page displays an error message with the response body

---

### Requirement: Customer page — order status lookup
The customer page SHALL also include an input to look up an order by id; on submit it
SHALL call `GET /orders/:id` with the Bearer demo JWT and display the order fields
(`id`, `status`, `customerId`, `amount`, `currency`, `createdAt`, `updatedAt`).

#### Scenario: Order found — displays order details
- **WHEN** the user enters a valid order id and submits
- **THEN** the page calls `GET /orders/:id` and renders the order fields

#### Scenario: Order not found — displays 404 message
- **WHEN** the user enters an unknown order id
- **THEN** the page displays a "Order not found" message
