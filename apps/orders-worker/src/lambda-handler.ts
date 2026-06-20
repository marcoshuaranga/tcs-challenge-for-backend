import type { SQSHandler } from 'aws-lambda';
import type { OrderAppService } from '@tcs-challenge-for-backend/orders';

export function makeHandler(appService: OrderAppService): SQSHandler {
  return async (event) => {
    for (const record of event.Records) {
      try {
        const parsed: unknown = JSON.parse(record.body);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          typeof (parsed as Record<string, unknown>)['orderId'] !== 'string'
        ) {
          throw new Error(`Missing or invalid orderId in record body: ${record.body}`);
        }
        const orderId = (parsed as { orderId: string }).orderId;
        await appService.processOrder(orderId);
      } catch (err) {
        console.error('Failed to process SQS record', record.messageId, err);
      }
    }
  };
}
