import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@tcs-challenge-for-backend/source', 'node', 'import', 'default'],
  },
});
