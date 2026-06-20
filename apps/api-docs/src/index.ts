import { serve } from '@hono/node-server';
import { makeDocsApp } from './app';

const port = Number(process.env['PORT'] ?? 3002);

serve({ fetch: makeDocsApp().fetch, port }, () => {
  console.log(`api-docs listening on http://localhost:${port}`);
});
