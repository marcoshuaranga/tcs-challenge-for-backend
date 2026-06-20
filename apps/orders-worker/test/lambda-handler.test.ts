import { describe, expect, it, vi } from 'vitest';
import type { SQSEvent } from 'aws-lambda';
import { composeOrders } from '@tcs-challenge-for-backend/orders';
import { makeHandler } from '../src/lambda-handler';

function sqsEvent(records: { body: string }[]): SQSEvent {
  return {
    Records: records.map((r) => ({
      body: r.body,
      messageId: 'msg-1',
      receiptHandle: 'rh-1',
      attributes: { ApproximateReceiveCount: '1' } as never,
      messageAttributes: {},
      md5OfBody: '',
      source: 'aws:sqs',
      eventSourceARN: '',
      awsRegion: 'us-east-1',
      eventSource: 'aws:sqs',
    })),
  };
}

describe('Lambda SQS handler', () => {
  it('valid record → processOrder called exactly once with the orderId', async () => {
    const app = composeOrders({});
    const spy = vi.spyOn(app, 'processOrder').mockResolvedValue({ ok: true, value: undefined });
    const handler = makeHandler(app);

    await handler(
      sqsEvent([{ body: JSON.stringify({ orderId: 'ord-1' }) }]),
      {} as never,
      () => {},
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ord-1');
  });

  it('invalid record body → error logged, remaining records still processed', async () => {
    const app = composeOrders({});
    const spy = vi.spyOn(app, 'processOrder').mockResolvedValue({ ok: true, value: undefined });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = makeHandler(app);

    await handler(
      sqsEvent([{ body: 'not-json' }, { body: JSON.stringify({ orderId: 'ord-2' }) }]),
      {} as never,
      () => {},
    );

    expect(consoleSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('ord-2');
    consoleSpy.mockRestore();
  });
});
