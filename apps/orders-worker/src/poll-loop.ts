import type { OrderAppService } from '@tcs-challenge-for-backend/orders';

interface DrainablePublisher {
  drain(): string[];
}

export function startPollLoop(
  appService: OrderAppService,
  publisher: DrainablePublisher,
): () => void {
  let stopped = false;

  async function tick(): Promise<void> {
    if (stopped) return;
    const ids = publisher.drain();
    for (const id of ids) {
      await appService.processOrder(id);
    }
    setTimeout(() => void tick(), 0);
  }

  void tick();

  return () => {
    stopped = true;
  };
}
