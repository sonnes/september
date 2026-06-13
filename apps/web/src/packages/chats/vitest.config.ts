import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@september/chats': path.resolve(__dirname, '.'),
      '@september/shared': path.resolve(__dirname, '../shared'),
      '@september/analytics': path.resolve(__dirname, '../analytics'),
    },
  },
});
