import { describe, it, expect, vi } from 'vitest';
import { DeleteMessageCommand, ReceiveMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import {
  composeOrders,
  InvalidStateTransitionError,
  OrderNotFoundError,
} from '@tcs-challenge-for-backend/orders';
import { startSqsConsumer } from '../src/sqs-consumer';

const QUEUE_URL = 'http://localhost/queue';

function msg(body: string, id = 'msg-1', rh = 'rh-1') {
  return { Body: body, MessageId: id, ReceiptHandle: rh };
}

function makeMockClient(firstBatch: ReturnType<typeof msg>[]) {
  const deleted: string[] = [];
  let firstReceiveDone = false;
  const send = vi.fn().mockImplementation(async (cmd: unknown) => {
    if (cmd instanceof ReceiveMessageCommand) {
      if (!firstReceiveDone) {
        firstReceiveDone = true;
        return { Messages: firstBatch };
      }
      // Slow down subsequent polls so stop() takes effect before they complete
      await new Promise((r) => setTimeout(r, 200));
      return {};
    }
    if (cmd instanceof DeleteMessageCommand) {
      deleted.push((cmd as DeleteMessageCommand).input.ReceiptHandle!);
    }
    return {};
  });
  return { client: { send } as unknown as SQSClient, deleted, send };
}

describe('startSqsConsumer', () => {
  it('valid message → processOrder called and message deleted', async () => {
    const app = composeOrders({});
    const spy = vi.spyOn(app, 'processOrder').mockResolvedValue({ ok: true, value: undefined });
    const { client, deleted } = makeMockClient([msg(JSON.stringify({ orderId: 'ord-1' }))]);

    const stop = startSqsConsumer(client, QUEUE_URL, app);
    await new Promise((r) => setTimeout(r, 50));
    stop();

    expect(spy).toHaveBeenCalledWith('ord-1');
    expect(deleted).toContain('rh-1');
  });

  it('invalid JSON → error logged, message left in queue', async () => {
    const app = composeOrders({});
    const spy = vi.spyOn(app, 'processOrder');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, deleted } = makeMockClient([msg('not-json')]);

    const stop = startSqsConsumer(client, QUEUE_URL, app);
    await new Promise((r) => setTimeout(r, 50));
    stop();

    expect(spy).not.toHaveBeenCalled();
    expect(deleted).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('valid JSON but invalid schema → error logged, message left in queue', async () => {
    const app = composeOrders({});
    const spy = vi.spyOn(app, 'processOrder');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, deleted } = makeMockClient([msg(JSON.stringify({ notOrderId: 'foo' }))]);

    const stop = startSqsConsumer(client, QUEUE_URL, app);
    await new Promise((r) => setTimeout(r, 50));
    stop();

    expect(spy).not.toHaveBeenCalled();
    expect(deleted).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('processOrder returns InvalidStateTransitionError → message deleted (idempotent re-delivery)', async () => {
    const app = composeOrders({});
    vi.spyOn(app, 'processOrder').mockResolvedValue({
      ok: false,
      error: new InvalidStateTransitionError('COMPLETED', 'PROCESSING'),
    });
    const { client, deleted } = makeMockClient([msg(JSON.stringify({ orderId: 'ord-1' }))]);

    const stop = startSqsConsumer(client, QUEUE_URL, app);
    await new Promise((r) => setTimeout(r, 50));
    stop();

    expect(deleted).toContain('rh-1');
  });

  it('processOrder returns other error → error logged, message left in queue', async () => {
    const app = composeOrders({});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(app, 'processOrder').mockResolvedValue({
      ok: false,
      error: new OrderNotFoundError('ord-1'),
    });
    const { client, deleted } = makeMockClient([msg(JSON.stringify({ orderId: 'ord-1' }))]);

    const stop = startSqsConsumer(client, QUEUE_URL, app);
    await new Promise((r) => setTimeout(r, 50));
    stop();

    expect(deleted).toHaveLength(0);
    consoleSpy.mockRestore();
  });
});
