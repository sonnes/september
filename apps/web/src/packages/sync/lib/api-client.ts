import type { LoginResult, Mutation, PullResult, PushResult } from '../types';

export interface SyncClientOptions {
  baseUrl: string;
  getToken: () => string | null;
}

export interface SyncClient {
  login: (idToken: string) => Promise<LoginResult>;
  push: (mutations: Mutation[]) => Promise<PushResult>;
  pull: (since: number) => Promise<PullResult>;
  putBlob: (key: string, body: ArrayBuffer | Uint8Array | Blob, contentType?: string) => Promise<void>;
  getBlob: (key: string) => Promise<ArrayBuffer | null>;
  deleteBlob: (key: string) => Promise<void>;
}

export function createSyncClient({ baseUrl, getToken }: SyncClientOptions): SyncClient {
  const authHeaders = (): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  async function expectOk(res: Response): Promise<Response> {
    if (!res.ok) throw new Error(`sync request failed: ${res.status}`);
    return res;
  }

  return {
    async login(idToken) {
      const res = await expectOk(
        await fetch(`${baseUrl}/api/auth/google`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }),
      );
      return (await res.json()) as LoginResult;
    },

    async push(mutations) {
      const res = await expectOk(
        await fetch(`${baseUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ mutations }),
        }),
      );
      return (await res.json()) as PushResult;
    },

    async pull(since) {
      const res = await expectOk(
        await fetch(`${baseUrl}/api/sync/pull?since=${since}`, { headers: authHeaders() }),
      );
      return (await res.json()) as PullResult;
    },

    async putBlob(key, body, contentType = 'application/octet-stream') {
      await expectOk(
        await fetch(`${baseUrl}/api/blobs/${key}`, {
          method: 'PUT',
          headers: { 'content-type': contentType, ...authHeaders() },
          body: body as BodyInit,
        }),
      );
    },

    async getBlob(key) {
      const res = await fetch(`${baseUrl}/api/blobs/${key}`, { headers: authHeaders() });
      if (res.status === 404) return null;
      await expectOk(res);
      return res.arrayBuffer();
    },

    async deleteBlob(key) {
      await expectOk(
        await fetch(`${baseUrl}/api/blobs/${key}`, { method: 'DELETE', headers: authHeaders() }),
      );
    },
  };
}
