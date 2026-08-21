import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ponytail: `/src` is project-root relative, so no `node:path` import and no
  // `@types/node` dependency just to build one alias.
  resolve: { alias: { '@': '/src' } },
  server: {
    port: 3010,
    strictPort: true,
  },
});
