import { handle } from 'hono/aws-lambda';
import { makeApp } from './app';

const app = makeApp({
  JWT_SECRET: process.env['JWT_SECRET'] ?? '',
  USE_AWS_DYNAMO: process.env['USE_AWS_DYNAMO'],
  USE_AWS_SQS: process.env['USE_AWS_SQS'],
  FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'],
  ORDERS_TABLE: process.env['ORDERS_TABLE'],
  AWS_REGION: process.env['AWS_REGION'],
  DDB_ENDPOINT: process.env['DDB_ENDPOINT'],
  QUEUE_URL: process.env['QUEUE_URL'],
});

export const handler = handle(app);
