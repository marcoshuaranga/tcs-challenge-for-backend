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
    // First process moves it to COMPLETED
    await app.request(`/orders/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Second call should 409
    const res = await app.request(`/orders/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('with valid JWT and PENDING order returns 202 with { id, status }', async () => {
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
    expect(body.status).toBe('PENDING');
  });
});
