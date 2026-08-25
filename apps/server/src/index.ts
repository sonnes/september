import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return new Response('Not found', { status: 404 });
    }

    // A file that exists answers for itself: the assets, and the prerendered
    // landing page at `/`.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    // Everything left is an application route. It gets the empty shell, never
    // the landing page, so a deep link does not paint the marketing copy while
    // its bundle boots.
    return env.ASSETS.fetch(new URL('/app.html', request.url));
  },
} satisfies ExportedHandler<Env>;
