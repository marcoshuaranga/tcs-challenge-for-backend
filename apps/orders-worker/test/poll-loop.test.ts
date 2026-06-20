import { describe, expect, it, vi } from 'vitest';
import { composeOrders, InMemoryMessagePublisher } from '@tcs-challenge-for-backend/orders';
import { startPollLoop } from '../src/poll-loop';

describe('startPollLoop', () => {
  it('drains one orderId and calls processOrder', async () => {
    const app = composeOrders({});
    // Register an order so it gets published
    const result = await app.registerOrder({ customerId: 'C1', amount: 50, currency: 'USD' });
    expect(result.ok).toBe(true);

    // Grab the publisher from the composition (we need a shared instance)
    // Use a standalone InMemoryMessagePublisher seeded with the orderId
    const publisher = new InMemoryMessagePublisher();
    if (!result.ok) return;
    await publisher.publishProcessOrder(result.value.id);

    // Spy on processOrder
    const spy = vi.spyOn(app, 'processOrder');

    const stop = startPollLoop(app, publisher);
    // Run one tick
    await new Promise((r) => setTimeout(r, 10));
    stop();

    expect(spy).toHaveBeenCalledWith(result.value.id);
  });

  it('empty queue — poll-loop iterates without calling processOrder', async () => {
    const app = composeOrders({});
    const publisher = new InMemoryMessagePublisher();
    const spy = vi.spyOn(app, 'processOrder');

    const stop = startPollLoop(app, publisher);
    await new Promise((r) => setTimeout(r, 10));
    stop();

    expect(spy).not.toHaveBeenCalled();
  });
});
