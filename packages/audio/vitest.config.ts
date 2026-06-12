import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Storage uses IndexedDB (fake-indexeddb) and Blob/ArrayBuffer.
    // setupFiles patches global Blob with Node's real Blob (which has arrayBuffer())
    // because the vitest node polyfill is stripped.
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
  },
  resolve: {
    alias: {
      '@september/audio': path.resolve(__dirname, '.'),
      '@september/shared': path.resolve(__dirname, '../shared'),
    },
  },
});
