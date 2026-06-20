import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import { makeApp } from '../src/app';

const TEST_SECRET = 'test-secret';

async function makeToken() {
  return sign({ sub: 'user-1' }, TEST_SECRET);
}

async function createPendingOrder(app: ReturnType<typeof makeApp>, token: string) {
  const res = await app.request('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: 'C1', amount: 50, currency: 'USD' }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

describe('GET /health', () => {
  it('returns 200 with { status: ok }', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});

describe('POST /orders', () => {
  it('without Bearer token returns 401', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const res = await app.request('/orders', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('with valid JWT + valid body returns 201 with { id, status: PENDING }', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const res = await app.request('/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerId: 'C1', amount: 50, currency: 'USD' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; status: string };
    expect(typeof body.id).toBe('string');
    expect(body.status).toBe('PENDING');
  });

  it('with valid JWT + invalid body returns 422', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const res = await app.request('/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: -1 }),
    });
    expect(res.status).toBe(422);
  });
});

describe('GET /orders', () => {
  it('without Bearer token returns 401', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const res = await app.request('/orders');
    expect(res.status).toBe(401);
  });

  it('with valid JWT and empty store returns 200 with []', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const res = await app.request('/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('with valid JWT and existing orders returns 200 with array of OrderResponseDto', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    await createPendingOrder(app, token);
    await createPendingOrder(app, token);
    const res = await app.request('/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      id: string;
      status: string;
      customerId: string;
      amount: number;
      currency: string;
      createdAt: string;
      updatedAt: string;
    }>;
    expect(body).toHaveLength(2);
    expect(body[0].status).toBe('PENDING');
    expect(body[0].customerId).toBe('C1');
    expect(body[0].amount).toBe(50);
    expect(body[0].currency).toBe('USD');
    expect(typeof body[0].createdAt).toBe('string');
    expect(typeof body[0].updatedAt).toBe('string');
  });
});

describe('GET /orders/:id', () => {
  it('without Bearer token returns 401', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const res = await app.request('/orders/some-id');
    expect(res.status).toBe(401);
  });

  it('with valid JWT and unknown id returns 404 with error envelope', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const res = await app.request('/orders/nonexistent', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('with valid JWT and known id returns 200 with OrderResponseDto', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const id = await createPendingOrder(app, token);
    const res = await app.request(`/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      status: string;
      customerId: string;
      amount: number;
      currency: string;
      createdAt: string;
      updatedAt: string;
    };
    expect(body.id).toBe(id);
    expect(body.status).toBe('PENDING');
    expect(body.customerId).toBe('C1');
    expect(body.amount).toBe(50);
    expect(body.currency).toBe('USD');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });
});

describe('GET /orders/:id/audit', () => {
  it('without Bearer token returns 401', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const res = await app.request('/orders/some-id/audit');
    expect(res.status).toBe(401);
  });

  it('with valid JWT and unknown id returns 404 with error envelope', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const res = await app.request('/orders/nonexistent/audit', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('with valid JWT and known order returns 200 with audit array', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const id = await createPendingOrder(app, token);
    const res = await app.request(`/orders/${id}/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});

describe('POST /orders/:id/process', () => {
  it('without Bearer token returns 401', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const res = await app.request('/orders/some-id/process', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('with valid JWT and unknown id returns 404 with error envelope', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const res = await app.request('/orders/nonexistent/process', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('with valid JWT and non-PENDING order returns 409 with error envelope', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const id = await createPendingOrder(app, token);
    await app.request(`/orders/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await app.request(`/orders/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('with valid JWT and PENDING order returns 202 with actual post-processing status', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET });
    const token = await makeToken();
    const id = await createPendingOrder(app, token);
    const res = await app.request(`/orders/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(202);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.id).toBe(id);
    // In-memory path runs synchronously; payment always succeeds with default FAIL_ABOVE_AMOUNT
    expect(body.status).toBe('COMPLETED');
  });

  it('FAILED order exposes failureReason in GET /orders/:id response', async () => {
    const app = makeApp({ JWT_SECRET: TEST_SECRET, FAIL_ABOVE_AMOUNT: '10' });
    const token = await makeToken();
    // amount=50 > FAIL_ABOVE_AMOUNT=10 → payment declines → FAILED
    const res = await app.request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: 'C1', amount: 50, currency: 'USD' }),
    });
    const created = (await res.json()) as { id: string };
    await app.request(`/orders/${created.id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const getRes = await app.request(`/orders/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(200);
    const order = (await getRes.json()) as { status: string; failureReason?: string };
    expect(order.status).toBe('FAILED');
    expect(typeof order.failureReason).toBe('string');
  });
});
