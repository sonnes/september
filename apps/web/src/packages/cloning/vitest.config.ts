import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
  },
  resolve: {
    alias: {
      '@/packages/cloning': path.resolve(__dirname, '.'),
      '@/packages/audio': path.resolve(__dirname, '../audio'),
      '@/packages/account': path.resolve(__dirname, '../account'),
      '@/packages/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
