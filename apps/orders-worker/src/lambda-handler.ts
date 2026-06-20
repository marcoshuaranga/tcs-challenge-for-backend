import type { SQSHandler } from 'aws-lambda';
import { composeOrders, type OrderAppService } from '@tcs-challenge-for-backend/orders';
import { ProcessOrderMessageSchema } from '@tcs-challenge-for-backend/contracts';

function safeJsonParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function makeHandler(appService: OrderAppService): SQSHandler {
  return async (event) => {
    for (const record of event.Records) {
      const body = safeJsonParse(record.body);
      if (body === null) {
        console.error('Invalid JSON in SQS record body', record.messageId, record.body);
        continue;
      }
      const result = ProcessOrderMessageSchema.safeParse(body);
      if (!result.success) {
        console.error('Invalid SQS message payload', record.messageId, result.error.issues);
        continue;
      }
      const outcome = await appService.processOrder(result.data.orderId);
      if (!outcome.ok) {
        console.error('[lambda-handler] processOrder error', record.messageId, outcome.error.message);
      }
    }
  };
}

const appService = composeOrders({
  USE_AWS_DYNAMO: process.env['USE_AWS_DYNAMO'],
  USE_AWS_SQS: process.env['USE_AWS_SQS'],
  FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'],
  ORDERS_TABLE: process.env['ORDERS_TABLE'],
  AWS_REGION: process.env['AWS_REGION'],
  DDB_ENDPOINT: process.env['DDB_ENDPOINT'],
  QUEUE_URL: process.env['QUEUE_URL'],
});

export const handler = makeHandler(appService);
