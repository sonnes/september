import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

// `server.headers` doesn't reach the TanStack Start SSR middleware, so the
// top-level HTML document (the one that actually needs to be cross-origin
// isolated for SharedArrayBuffer / WebLLM) is served without COOP/COEP in
// dev & preview. This middleware sets them on every response. In production
// the same headers are applied at the edge via vercel.json.
function crossOriginIsolationHeaders() {
  const apply = (server) => {
    server.middlewares.use((_req, res, next) => {
      for (const [key, value] of Object.entries(crossOriginIsolation)) {
        res.setHeader(key, value);
      }
      next();
    });
  };
  return {
    name: 'cross-origin-isolation-headers',
    configureServer: apply,
    configurePreviewServer: apply,
  };
}

export default defineConfig({
  plugins: [
    crossOriginIsolationHeaders(),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true },
      pages: [
        { path: '/' },
        { path: '/privacy-policy' },
        { path: '/terms-of-service' },
      ],
    }),
    viteReact(),
  ],
});
