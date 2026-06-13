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
      '@september/cloning': path.resolve(__dirname, '.'),
      '@september/audio': path.resolve(__dirname, '../audio'),
      '@september/account': path.resolve(__dirname, '../account'),
      '@september/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
