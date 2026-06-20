import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type { OrderAppService } from '@tcs-challenge-for-backend/orders';

export function startSqsConsumer(
  client: SQSClient,
  queueUrl: string,
  appService: OrderAppService,
): () => void {
  let stopped = false;

  async function poll(): Promise<void> {
    if (stopped) return;
    try {
      const result = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
        }),
      );
      for (const msg of result.Messages ?? []) {
        try {
          const { orderId } = JSON.parse(msg.Body!) as { orderId: string };
          const processed = await appService.processOrder(orderId);
          if (!processed.ok) {
            console.error('[sqs-consumer] processOrder failed, leaving in queue:', processed.error);
            continue;
          }
          await client.send(
            new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: msg.ReceiptHandle!,
            }),
          );
        } catch (err) {
          console.error('[sqs-consumer] message error, leaving in queue:', err);
        }
      }
    } catch (err) {
      console.error('[sqs-consumer] poll error:', err);
    }
    if (!stopped) void poll();
  }

  void poll();

  return () => {
    stopped = true;
  };
}
