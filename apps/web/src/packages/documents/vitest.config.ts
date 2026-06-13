import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@september/documents': path.resolve(__dirname, '.'),
      '@september/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
