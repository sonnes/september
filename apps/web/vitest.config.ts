import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { '@platform': '/src' },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
