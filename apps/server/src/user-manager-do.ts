import { DurableObject } from 'cloudflare:workers';

import { signSessionToken } from './auth';
import { SESSION_TTL_SECONDS, type Env } from './types';

export interface GoogleIdentity {
  sub: string;
  email: string;
}

export interface LoginResult {
  token: string;
  userId: string;
}

/**
 * The single common Durable Object: the user registry + session issuance.
 * Addressed as a singleton (`idFromName("global")`). It never sees raw Google
 * tokens — the Worker verifies those at the edge and passes the identity in, so
 * this DO stays network-free and is not on the per-request hot path (steady
 * traffic verifies stateless tokens at the edge without touching it).
 */
export class UserManagerDO extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_sub TEXT UNIQUE NOT NULL,
        email TEXT,
        created_at INTEGER NOT NULL
      )`,
    );
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      )`,
    );
  }

  /** Upsert the user by Google sub and mint a fresh stateless session token. */
  async upsertAndIssue(identity: GoogleIdentity): Promise<LoginResult> {
    const existing = this.sql
      .exec<{ id: string }>('SELECT id FROM users WHERE google_sub = ?', identity.sub)
      .toArray();

    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
      this.sql.exec('UPDATE users SET email = ? WHERE id = ?', identity.email, userId);
    } else {
      userId = crypto.randomUUID();
      this.sql.exec(
        'INSERT INTO users (id, google_sub, email, created_at) VALUES (?, ?, ?, ?)',
        userId,
        identity.sub,
        identity.email,
        Date.now(),
      );
    }

    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const jti = crypto.randomUUID();
    const token = await signSessionToken({ sub: userId, jti, exp }, this.env.SESSION_SIGNING_KEY);
    return { token, userId };
  }

  /** Look up an existing user's id by Google sub (null if unknown). */
  userIdForSub(sub: string): string | null {
    const rows = this.sql.exec<{ id: string }>('SELECT id FROM users WHERE google_sub = ?', sub).toArray();
    return rows[0]?.id ?? null;
  }

  /** Mark a token id as revoked until its expiry (for logout / logout-all). */
  revoke(jti: string, expiresAtSeconds: number): void {
    this.sql.exec('INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)', jti, expiresAtSeconds);
  }

  isRevoked(jti: string): boolean {
    return this.sql.exec('SELECT 1 FROM revoked_tokens WHERE jti = ?', jti).toArray().length > 0;
  }
}
