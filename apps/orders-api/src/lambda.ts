import { handle } from 'hono/aws-lambda';
import { makeApp } from './app';

const app = makeApp({
  JWT_SECRET: process.env['JWT_SECRET'] ?? '',
  USE_AWS_DYNAMO: process.env['USE_AWS_DYNAMO'],
  USE_AWS_SQS: process.env['USE_AWS_SQS'],
  FAIL_ABOVE_AMOUNT: process.env['FAIL_ABOVE_AMOUNT'],
});

export const handler = handle(app);
