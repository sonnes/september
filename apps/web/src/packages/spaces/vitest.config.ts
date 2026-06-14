import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/packages/spaces': path.resolve(__dirname, '.'),
      '@/packages/shared': path.resolve(__dirname, '../shared'),
      '@/packages/usage': path.resolve(__dirname, '../usage'),
    },
  },
});
