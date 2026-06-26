import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthStore, decodeSessionPayload } from './auth';
import { memoryStorage } from './test-storage';

function makeToken(payload: object): string {
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64}.fake-signature`;
}

describe('decodeSessionPayload', () => {
  it('decodes sub and exp from a token', () => {
    const token = makeToken({ sub: 'user-9', jti: 'j', exp: 1893456000 });
    expect(decodeSessionPayload(token)).toMatchObject({ sub: 'user-9', exp: 1893456000 });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeSessionPayload('garbage')).toBeNull();
    expect(decodeSessionPayload('')).toBeNull();
  });
});

describe('createAuthStore', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('persists and reads back the session', () => {
    const store = createAuthStore();
    expect(store.getToken()).toBeNull();
    expect(store.getUserId()).toBeNull();

    store.setSession({ token: makeToken({ sub: 'u1', jti: 'j', exp: 9999999999 }), userId: 'u1' });
    expect(store.getToken()).toBeTruthy();
    expect(store.getUserId()).toBe('u1');
  });

  it('clears the session', () => {
    const store = createAuthStore();
    store.setSession({ token: makeToken({ sub: 'u1', jti: 'j', exp: 9999999999 }), userId: 'u1' });
    store.clear();
    expect(store.getToken()).toBeNull();
    expect(store.getUserId()).toBeNull();
  });

  it('treats an expired token as no valid session', () => {
    const store = createAuthStore();
    store.setSession({ token: makeToken({ sub: 'u1', jti: 'j', exp: 1 }), userId: 'u1' });
    expect(store.getToken()).toBeNull(); // expired → not returned
    expect(store.isAuthenticated()).toBe(false);
  });

  it('reports authenticated for a live token', () => {
    const store = createAuthStore();
    store.setSession({ token: makeToken({ sub: 'u1', jti: 'j', exp: 9999999999 }), userId: 'u1' });
    expect(store.isAuthenticated()).toBe(true);
  });
});
