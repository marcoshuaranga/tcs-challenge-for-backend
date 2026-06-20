import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { MessagePublisherPort } from '../application/ports';

export class SqsMessagePublisher implements MessagePublisherPort {
  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
  ) {}

  async publishProcessOrder(orderId: string): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({ orderId }),
      }),
    );
  }
}
