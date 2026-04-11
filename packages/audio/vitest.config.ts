import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // AudioService uses IndexedDB (fake-indexeddb) but no DOM APIs.
    // Run in node environment so Blob.arrayBuffer() is available (jsdom omits it).
    environment: 'node',
  },
  resolve: {
    alias: {
      '@september/audio': path.resolve(__dirname, '.'),
      '@september/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
