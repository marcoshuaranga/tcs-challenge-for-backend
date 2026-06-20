// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_API_DOCS_URL: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_DEMO_JWT: envField.string({ context: 'client', access: 'public' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    envDir: '../../', // Look for .env or .env.* files in the monorepo root, not just the app's directory
  },
});
