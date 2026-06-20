import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { ProcessOrderMessageSchema } from '@tcs-challenge-for-backend/contracts';
import { InvalidStateTransitionError, type OrderAppService } from '@tcs-challenge-for-backend/orders';

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
          const msgResult = ProcessOrderMessageSchema.safeParse(JSON.parse(msg.Body!));
          if (!msgResult.success) {
            console.error('[sqs-consumer] invalid message payload, leaving in queue:', msg.MessageId, msgResult.error.issues);
            continue;
          }
          const processed = await appService.processOrder(msgResult.data.orderId);
          if (!processed.ok) {
            if (processed.error instanceof InvalidStateTransitionError) {
              // Order already processed — idempotent re-delivery, safe to delete
            } else {
              console.error('[sqs-consumer] processOrder failed, leaving in queue:', processed.error);
              continue;
            }
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
