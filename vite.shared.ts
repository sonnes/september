/**
 * The Vite and Vitest pieces that every package shares. A path that starts
 * with `/` is relative to the root of the package that runs Vite.
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';
import type { ViteUserConfig } from 'vitest/config';

const SETUP = new URL('./vitest.setup.ts', import.meta.url).pathname;

/** `@` is the `src` folder of an app, and `@platform/adapter` is its platform. */
const appAliases = (platform: string) => ({ '@': '/src', '@platform/adapter': platform });

/** An app: React, Tailwind, the aliases, and a fixed dev port. */
export const appConfig = (port: number): UserConfig => ({
  plugins: [react(), tailwindcss()],
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
