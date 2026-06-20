import type { MessagePublisherPort } from '../application/ports';

export class InMemoryMessagePublisher implements MessagePublisherPort {
  readonly published: string[] = [];

  async publishProcessOrder(orderId: string): Promise<void> {
    this.published.push(orderId);
  }
}
