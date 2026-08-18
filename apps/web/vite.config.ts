import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import type { ConfigEnv, Connect, Plugin, UserConfig } from 'vite';
import { defineConfig } from 'vite';
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
function crossOriginIsolationHeaders(): Plugin {
  const apply = (middlewares: Connect.Server) => {
    middlewares.use((_req, res, next) => {
      for (const [key, value] of Object.entries(crossOriginIsolation)) {
        res.setHeader(key, value);
      }
      next();
    });
  };
  return {
    name: 'cross-origin-isolation-headers',
    configureServer: server => apply(server.middlewares),
    configurePreviewServer: server => apply(server.middlewares),
  };
}

const desktopRuntimeAliases = [
  {
    find: '@/packages/ai/lib/webllm-runtime',
    replacement: resolve('src/packages/ai/lib/webllm-runtime.desktop.ts'),
  },
  {
    find: '@/packages/ai/lib/whisper-runtime',
    replacement: resolve('src/packages/ai/lib/whisper-runtime.desktop.ts'),
  },
  {
    find: '@/packages/ai/lib/local-providers',
    replacement: resolve('src/packages/ai/lib/local-providers.desktop.ts'),
  },
  {
    find: '@/packages/speech/lib/providers/kokoro-runtime',
    replacement: resolve('src/packages/speech/lib/providers/kokoro-runtime.desktop.ts'),
  },
];

export function createViteConfig({ mode }: Pick<ConfigEnv, 'command' | 'mode'>): UserConfig {
  const isDesktop = mode === 'tauri';

  return {
    resolve: {
      alias: isDesktop ? desktopRuntimeAliases : [],
    },
    // onnxruntime-web (behind kokoro-js / @huggingface/transformers) breaks when
    // Vite pre-bundles it — .wasm asset URLs get rewritten. Load it untouched.
    optimizeDeps: isDesktop
      ? undefined
      : {
          exclude: ['kokoro-js', '@huggingface/transformers'],
        },
    // The Kokoro/Whisper workers use dynamic import(), which needs ES-module
    // worker output (the default iife format can't code-split).
    worker: {
      format: 'es' as const,
    },
    plugins: [
      crossOriginIsolationHeaders(),
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({
        spa: { enabled: true },
        pages: [{ path: '/' }, { path: '/privacy-policy' }, { path: '/terms-of-service' }],
      }),
      viteReact(),
    ],
  };
}

export default defineConfig(createViteConfig);
