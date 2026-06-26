import type { UserDataDO } from './user-data-do';
import type { UserManagerDO } from './user-manager-do';

export interface Env {
  // Secrets
  SESSION_SIGNING_KEY: string;
  GOOGLE_CLIENT_ID: string;

  // Bindings
  USER_MANAGER: DurableObjectNamespace<UserManagerDO>;
  USER_DATA: DurableObjectNamespace<UserDataDO>;
  USER_BLOBS: R2Bucket;
  ASSETS: Fetcher;
}

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
