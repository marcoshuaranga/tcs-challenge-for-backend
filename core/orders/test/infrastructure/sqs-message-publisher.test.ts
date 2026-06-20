import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { describe, expect, it, vi } from 'vitest';
import { SqsMessagePublisher } from '../../src/infrastructure/sqs-message-publisher';

const QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/orders-queue';

describe('SqsMessagePublisher', () => {
  it('publishProcessOrder sends SendMessageCommand with correct QueueUrl and MessageBody', async () => {
    const send = vi.fn().mockResolvedValue({});
    const client = { send } as unknown as SQSClient;
    const publisher = new SqsMessagePublisher(client, QUEUE_URL);

    await publisher.publishProcessOrder('abc-123');

    expect(send).toHaveBeenCalledOnce();
    const [command] = send.mock.calls[0] as [SendMessageCommand];
    expect(command).toBeInstanceOf(SendMessageCommand);
    expect(command.input).toEqual({
      QueueUrl: QUEUE_URL,
      MessageBody: '{"orderId":"abc-123"}',
    });
  });

  it('resolves without error when SQS client resolves', async () => {
    const client = { send: vi.fn().mockResolvedValue({}) } as unknown as SQSClient;
    const publisher = new SqsMessagePublisher(client, QUEUE_URL);
    await expect(publisher.publishProcessOrder('order-1')).resolves.toBeUndefined();
  });

  it('rejects when SQS client throws', async () => {
    const error = new Error('network failure');
    const client = { send: vi.fn().mockRejectedValue(error) } as unknown as SQSClient;
    const publisher = new SqsMessagePublisher(client, QUEUE_URL);
    await expect(publisher.publishProcessOrder('order-1')).rejects.toThrow('network failure');
  });
});
