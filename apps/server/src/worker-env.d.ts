/// <reference path="../node_modules/@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts" />
import type { Env as ServerEnv } from './types';

// Make the test/runtime `Cloudflare.Env` resolve to the asset binding type.
declare global {
  namespace Cloudflare {
    interface Env extends ServerEnv {}
  }
}

export {};
