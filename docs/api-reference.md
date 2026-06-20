# API Reference

Base URL (local): `http://localhost:3000`  
Base URL (AWS): `https://cnsy7jghla.execute-api.us-east-1.amazonaws.com`

---

## Auth

All `/orders*` routes require a Bearer JWT (HS256, HMAC-signed). Use the demo token from
`.env.example` (signed with `JWT_SECRET=change-me-in-local-only`):

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJleHAiOjE4MTM0NDk2MDB9.q_gVK7c1pQMVWifUK4CEYIv_E4Wct-F_Jwx084_hby4
```

---

## Endpoints

### Create an order

```bash
curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust-1","amount":500,"currency":"USD"}' | jq
# → 201 { id, status: "PENDING", customerId, amount, currency, createdAt, updatedAt }
```

### Get an order

```bash
curl -s http://localhost:3000/orders/<id> \
  -H "Authorization: Bearer <token>" | jq
# → 200 OrderResponse  |  404 if not found
```

### Trigger processing

```bash
curl -s -X POST http://localhost:3000/orders/<id>/process \
  -H "Authorization: Bearer <token>" | jq
# → 202 { id, status }
# Worker transitions: PENDING → PROCESSING → COMPLETED (or FAILED)
```

> To produce a `FAILED` order: create one with `amount > 10000`. The `FakePaymentGateway`
> declines it and the worker transitions it to `FAILED`.

### Get audit trail

```bash
curl -s http://localhost:3000/orders/<id>/audit \
  -H "Authorization: Bearer <token>" | jq
# → 200 AuditEntry[]
# Events in order: ORDER_CREATED → ORDER_PROCESSING_STARTED → ORDER_COMPLETED (or ORDER_FAILED)
```

Each entry: `orderId`, `event`, `previousState`, `newState`, `timestamp`, `reason` (on `ORDER_FAILED`).

### List all orders

```bash
curl -s http://localhost:3000/orders \
  -H "Authorization: Bearer <token>" | jq
# → 200 OrderResponse[]
```

### Health check (no auth)

```bash
curl -s http://localhost:3000/health
# → 200 { status: "ok" }
```

---

## Error envelope

All errors return `{ "error": { "code": "...", "message": "..." } }`.

| Scenario | HTTP |
| --- | --- |
| Invalid or missing body field | `422` |
| Missing / invalid Bearer token | `401` |
| Order not found | `404` |
| Illegal state transition | `409` |
