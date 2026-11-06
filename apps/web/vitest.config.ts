import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Shared screens and services meet an in-memory platform in tests.
    alias: { '@platform/adapter': '/src/test/platform.ts' },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
