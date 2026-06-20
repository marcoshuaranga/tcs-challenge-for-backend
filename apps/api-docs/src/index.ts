import { serve } from '@hono/node-server';
import { buildApp } from './app';

const port = Number(process.env['PORT'] ?? 3001);

serve({ fetch: buildApp().fetch, port }, () => {
  console.log(`api-docs listening on http://localhost:${port}`);
});
