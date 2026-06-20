import { composeOrders, InMemoryMessagePublisher } from '@tcs-challenge-for-backend/orders';
import { startPollLoop } from './poll-loop';

const env = process.env as Record<string, string | undefined>;
const appService = composeOrders({
  USE_AWS_DYNAMO: env['USE_AWS_DYNAMO'],
  USE_AWS_SQS: env['USE_AWS_SQS'],
  FAIL_ABOVE_AMOUNT: env['FAIL_ABOVE_AMOUNT'],
});

const publisher = new InMemoryMessagePublisher();
const stop = startPollLoop(appService, publisher);

process.on('SIGTERM', stop);
process.on('SIGINT', stop);
