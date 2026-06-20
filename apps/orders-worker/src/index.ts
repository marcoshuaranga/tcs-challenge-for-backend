import { SQSClient } from '@aws-sdk/client-sqs';
import { composeOrders, InMemoryMessagePublisher } from '@tcs-challenge-for-backend/orders';
import { startPollLoop } from './poll-loop';
import { startSqsConsumer } from './sqs-consumer';

const env = process.env as Record<string, string | undefined>;
const envConfig = {
  USE_AWS_DYNAMO: env['USE_AWS_DYNAMO'],
  USE_AWS_SQS: env['USE_AWS_SQS'],
  FAIL_ABOVE_AMOUNT: env['FAIL_ABOVE_AMOUNT'],
  ORDERS_TABLE: env['ORDERS_TABLE'],
  AWS_REGION: env['AWS_REGION'],
  DDB_ENDPOINT: env['DDB_ENDPOINT'],
  QUEUE_URL: env['QUEUE_URL'],
};

const useSqs = envConfig.USE_AWS_SQS === 'true' || envConfig.USE_AWS_SQS === '1';

let stop: () => void;
if (useSqs) {
  const appService = composeOrders(envConfig);
  const client = new SQSClient({ region: env['AWS_REGION'] ?? 'us-east-1' });
  stop = startSqsConsumer(client, env['QUEUE_URL']!, appService);
  console.log('[worker] SQS consumer started, polling', env['QUEUE_URL']);
} else {
  const publisher = new InMemoryMessagePublisher();
  const appService = composeOrders(envConfig, { publisher });
  stop = startPollLoop(appService, publisher);
  console.log('[worker] in-memory poll loop started');
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);
