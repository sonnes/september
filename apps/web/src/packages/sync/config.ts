// Sync is feature-flagged by env. With neither var set, the app behaves exactly
// as before (local-only, guest user) — nothing renders, nothing syncs.
export const SYNC_API_URL = import.meta.env.VITE_SYNC_API_URL as string | undefined;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const SYNC_ENABLED = Boolean(SYNC_API_URL && GOOGLE_CLIENT_ID);
