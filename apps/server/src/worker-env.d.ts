/// <reference path="../node_modules/@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts" />
import type { Env as ServerEnv } from './types';

// Make the test/runtime `Cloudflare.Env` resolve to our binding types so
// `env.USER_DATA.get(...)` returns a typed Durable Object stub in tests.
declare global {
  namespace Cloudflare {
    interface Env extends ServerEnv {}
  }
}

export {};
