import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }

    // Everything else is the SPA (served directly by the assets binding in
    // production via run_worker_first; this fallback covers direct invocation).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
