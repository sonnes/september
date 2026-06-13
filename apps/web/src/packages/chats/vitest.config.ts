import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/packages/chats': path.resolve(__dirname, '.'),
      '@/packages/shared': path.resolve(__dirname, '../shared'),
      '@/packages/analytics': path.resolve(__dirname, '../analytics'),
    },
  },
});
