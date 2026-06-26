// Client-side session storage for the sync backend. The token is the stateless
// HMAC session token minted by the server; we decode (but never trust) its
// payload to read the userId and expiry.

const TOKEN_KEY = 'september.sync.token';
const USER_KEY = 'september.sync.userId';

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
  setSession: (session: Session) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export function createAuthStore(): AuthStore {
  const getToken = (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || isExpired(token)) return null;
    return token;
  };

  return {
    getToken,
    getUserId: () => (getToken() ? localStorage.getItem(USER_KEY) : null),
    setSession: ({ token, userId }) => {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, userId);
    },
    clear: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    isAuthenticated: () => getToken() !== null,
  };
}
