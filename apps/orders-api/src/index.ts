import { serve } from '@hono/node-server';
import { makeApp } from './app';

const env = {
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
  USE_AWS_DYNAMO: process.env.USE_AWS_DYNAMO,
  USE_AWS_SQS: process.env.USE_AWS_SQS,
};

const app = makeApp(env);
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`orders-api listening on port ${port}`);
});
