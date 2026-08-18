// Client-side session storage for the sync backend. The token is the stateless
// HMAC session token minted by the server; we decode (but never trust) its
// payload to read the userId and expiry.
import {
  deleteDesktopSetting,
  getDesktopSetting,
  isDesktopRuntime,
  putDesktopSetting,
} from '@/packages/shared/lib/data';

const TOKEN_KEY = 'september.sync.token';
const USER_KEY = 'september.sync.userId';
const DESKTOP_SESSION_KEY = 'sync-session';

export interface SessionPayload {
  sub: string;
  jti: string;
  exp: number; // unix seconds
}

export function decodeSessionPayload(token: string): SessionPayload | null {
  const [payloadB64] = token.split('.');
  if (!payloadB64) return null;
  try {
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')));
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeSessionPayload(token);
  return !payload || payload.exp <= Date.now() / 1000;
}

export interface Session {
  token: string;
  userId: string;
}

export interface AuthStore {
  getToken: () => string | null;
  getUserId: () => string | null;
  hydrate: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  clear: () => Promise<void>;
  isAuthenticated: () => boolean;
}

export function createAuthStore(): AuthStore {
  const desktop = isDesktopRuntime();
  let session: Session | null = desktop
    ? null
    : {
        token: localStorage.getItem(TOKEN_KEY) ?? '',
        userId: localStorage.getItem(USER_KEY) ?? '',
      };

  const getToken = (): string | null => {
    const token = session?.token;
    if (!token || isExpired(token)) return null;
    return token;
  };

  return {
    getToken,
    getUserId: () => (getToken() ? session?.userId || null : null),
    async hydrate() {
      if (!desktop) return;
      const stored = await getDesktopSetting<Session>(DESKTOP_SESSION_KEY);
      session = stored && !isExpired(stored.token) ? stored : null;
      if (stored && !session) await deleteDesktopSetting(DESKTOP_SESSION_KEY);
    },
    async setSession(next) {
      const previous = session;
      session = next;
      try {
        if (desktop) await putDesktopSetting(DESKTOP_SESSION_KEY, next);
        else {
          localStorage.setItem(TOKEN_KEY, next.token);
          localStorage.setItem(USER_KEY, next.userId);
        }
      } catch (error) {
        session = previous;
        throw error;
      }
    },
    async clear() {
      session = null;
      if (desktop) await deleteDesktopSetting(DESKTOP_SESSION_KEY);
      else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    },
    isAuthenticated: () => getToken() !== null,
  };
}
