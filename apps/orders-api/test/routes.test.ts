import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import { makeApp } from '../src/app';

const TEST_SECRET = 'test-secret';

async function makeToken() {
  return sign({ sub: 'user-1' }, TEST_SECRET);
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
    const body = await res.json();
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
