/**
 * The Vite and Vitest pieces that every package shares. A path that starts
 * with `/` is relative to the root of the package that runs Vite.
 */

import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin, UserConfig } from 'vite';
import type { ViteUserConfig } from 'vitest/config';

const SETUP = new URL('./vitest.setup.ts', import.meta.url).pathname;

/** The files that both apps serve from `/`: the brand marks and the Help screenshots. */
export const SHARED_PUBLIC = join(dirname(fileURLToPath(import.meta.url)), 'packages/app-ui/public/');

const TYPES: Record<string, string> = { '.png': 'image/png', '.svg': 'image/svg+xml' };

/** Every file under a folder, as paths relative to it. */
const filesIn = (folder: string): string[] =>
  readdirSync(folder, { recursive: true, encoding: 'utf8' }).filter(file =>
    statSync(join(folder, file)).isFile()
  );

/** Serves `SHARED_PUBLIC` beside the public folder of the app, in dev and in the build. */
const sharedPublic = (): Plugin => ({
  name: 'september-shared-public',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = normalize(decodeURIComponent((request.url ?? '').split('?')[0]));
      const file = join(SHARED_PUBLIC, path);
      if (!file.startsWith(SHARED_PUBLIC) || !existsSync(file) || !statSync(file).isFile()) {
        return next();
      }
      response.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
      createReadStream(file).pipe(response);
    });
  },
  generateBundle() {
    for (const fileName of filesIn(SHARED_PUBLIC)) {
      this.emitFile({ type: 'asset', fileName, source: readFileSync(join(SHARED_PUBLIC, fileName)) });
    }
  },
});

/** `@` is the `src` folder of an app, and `@platform/adapter` is its platform. */
const appAliases = (platform: string) => ({ '@': '/src', '@platform/adapter': platform });

/** An app: React, Tailwind, the shared public files, the aliases, and a fixed dev port. */
export const appConfig = (port: number): UserConfig => ({
  plugins: [react(), tailwindcss(), sharedPublic()],
  resolve: { alias: appAliases('/src/platform.ts') },
  server: { port, strictPort: true },
});

/**
 * Tests in jsdom, after the shared setup. An app passes the platform that
 * its tests use and its own setup files.
 */
export const testConfig = ({
  platform,
  setupFiles = [],
}: { platform?: string; setupFiles?: string[] } = {}): ViteUserConfig => ({
  resolve: platform ? { alias: appAliases(platform) } : {},
  test: { environment: 'jsdom', setupFiles: [SETUP, ...setupFiles] },
});
