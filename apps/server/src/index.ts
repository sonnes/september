import { verifyGoogleIdToken, verifySessionToken } from './auth';
import type { Env } from './types';
import type { Mutation } from './user-data-do';

export { UserManagerDO } from './user-manager-do';
export { UserDataDO } from './user-data-do';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  return match ? match[1] : null;
}

/** Verify the stateless session token at the edge; returns userId or null. */
async function authUserId(request: Request, env: Env): Promise<string | null> {
  const token = bearer(request);
  if (!token) return null;
  const payload = await verifySessionToken(token, env.SESSION_SIGNING_KEY);
  return payload?.sub ?? null;
}

function userData(env: Env, userId: string) {
  return env.USER_DATA.get(env.USER_DATA.idFromName(userId));
}

function userManager(env: Env) {
  return env.USER_MANAGER.get(env.USER_MANAGER.idFromName('global'));
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const { idToken } = (await request.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return json({ error: 'missing idToken' }, 400);

  const identity = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
  if (!identity) return json({ error: 'invalid token' }, 401);

  const result = await userManager(env).upsertAndIssue({ sub: identity.sub, email: identity.email });
  return json(result);
}

async function handleSync(request: Request, env: Env, userId: string, action: string): Promise<Response> {
  const stub = userData(env, userId);
  if (action === 'push' && request.method === 'POST') {
    const { mutations } = (await request.json().catch(() => ({}))) as { mutations?: Mutation[] };
    if (!Array.isArray(mutations)) return json({ error: 'missing mutations' }, 400);
    return json(await stub.push(mutations));
  }
  if (action === 'pull' && request.method === 'GET') {
    const since = Number(new URL(request.url).searchParams.get('since') ?? '0') || 0;
    return json(await stub.pull(since));
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleBlob(request: Request, env: Env, userId: string, key: string): Promise<Response> {
  if (!key) return json({ error: 'missing key' }, 400);
  const objectKey = `users/${userId}/${key}`;

  switch (request.method) {
    case 'PUT': {
      await env.USER_BLOBS.put(objectKey, request.body, {
        httpMetadata: { contentType: request.headers.get('content-type') ?? 'application/octet-stream' },
      });
      return json({ ok: true });
    }
    case 'GET': {
      const object = await env.USER_BLOBS.get(objectKey);
      if (!object) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      return new Response(object.body, { headers });
    }
    case 'DELETE': {
      await env.USER_BLOBS.delete(objectKey);
      return json({ ok: true });
    }
    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/auth/google') return handleAuth(request, env);

    if (path.startsWith('/api/sync/') || path.startsWith('/api/blobs/')) {
      const userId = await authUserId(request, env);
      if (!userId) return new Response('Unauthorized', { status: 401 });

      if (path.startsWith('/api/sync/')) {
        return handleSync(request, env, userId, path.slice('/api/sync/'.length));
      }
      return handleBlob(request, env, userId, path.slice('/api/blobs/'.length));
    }

    if (path.startsWith('/api/')) return new Response('Not found', { status: 404 });

    // Everything else is the SPA (served directly by the assets binding in
    // production via run_worker_first; this fallback covers direct invocation).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
