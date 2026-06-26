import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        // Test-only secret bindings (overridden in prod via `wrangler secret put`).
        bindings: {
          SESSION_SIGNING_KEY: 'test-signing-key-do-not-use-in-prod',
          GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
        },
      },
    }),
  ],
});
