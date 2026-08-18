'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { isDesktopRuntime, subscribeDesktopRecordWrites } from '@/packages/shared/lib/data';
import type { User } from '@/packages/shared/types/user';

import { setBlobClient } from './blob-bridge';
import { SYNC_API_URL, SYNC_ENABLED } from './config';
import { type SyncClient, createSyncClient } from './lib/api-client';
import { createAuthStore } from './lib/auth';
import { createCursorStore } from './lib/cursor';
import { createDesktopSyncStorage } from './lib/desktop-rpc';
import { type SyncEngine, createSyncEngine } from './lib/engine';
import {
  clearProfile,
  hydrateProfile,
  profileFromIdToken,
  readProfile,
  writeProfile,
} from './lib/profile';
import { buildSyncCollections } from './registry';
import { outbox } from './runtime';

export interface SyncAuthValue {
  user: User | null;
  signInWithCredential: (idToken: string) => Promise<void>;
  signOut: () => void;
}

const SyncAuthContext = createContext<SyncAuthValue | null>(null);

/** Returns the sync auth value, or null when sync is disabled / unmounted. */
export function useSyncAuth(): SyncAuthValue | null {
  return useContext(SyncAuthContext);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  if (!SYNC_ENABLED) return <>{children}</>;
  return <SyncProviderInner>{children}</SyncProviderInner>;
}

function SyncProviderInner({ children }: { children: ReactNode }) {
  const authStore = useMemo(() => createAuthStore(), []);
  const [authReady, setAuthReady] = useState(() => !isDesktopRuntime());
  const [userId, setUserId] = useState<string | null>(() => authStore.getUserId());
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (authReady) return;
    let cancelled = false;
    void Promise.all([authStore.hydrate(), hydrateProfile()])
      .then(() => {
        if (cancelled) return;
        setUserId(authStore.getUserId());
        setAuthReady(true);
      })
      .catch(error => {
        console.error('[sync] desktop session hydration failed', error);
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, authStore]);

  const client: SyncClient = useMemo(
    () => createSyncClient({ baseUrl: SYNC_API_URL as string, getToken: authStore.getToken }),
    [authStore]
  );

  const signInWithCredential = useCallback(
    async (idToken: string) => {
      const session = await client.login(idToken);
      await authStore.setSession(session);
      await writeProfile(profileFromIdToken(idToken));
      setUserId(session.userId);
    },
    [authStore, client]
  );

  const signOut = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    void authStore.clear().catch(error => console.error('[sync] session clear failed', error));
    void clearProfile().catch(error => console.error('[sync] profile clear failed', error));
    setUserId(null);
  }, [authStore]);

  // Start the sync engine while authenticated.
  useEffect(() => {
    if (!authReady || !userId) return;
    const engine = createSyncEngine({
      client,
      outbox,
      cursor: createCursorStore(userId),
      collections: buildSyncCollections(),
      desktopStorage: isDesktopRuntime() ? createDesktopSyncStorage() : undefined,
      subscribeFlushNeeded: isDesktopRuntime()
        ? callback => subscribeDesktopRecordWrites(callback)
        : undefined,
    });
    engineRef.current = engine;
    engine.start();
    setBlobClient(client); // route audio blob mirroring to this user's R2 prefix

    const onOnline = () => {
      void engine.flush().catch(() => {});
      void engine.pullOnce().catch(() => {});
    };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('online', onOnline);
      engine.stop();
      setBlobClient(null);
      engineRef.current = null;
    };
  }, [authReady, userId, client]);

  const value = useMemo<SyncAuthValue>(() => {
    const profile = userId ? readProfile() : null;
    const user: User | null = userId
      ? {
          id: userId,
          email: profile?.email,
          user_metadata: { full_name: profile?.name, avatar_url: profile?.picture },
        }
      : null;
    return { user, signInWithCredential, signOut };
  }, [userId, signInWithCredential, signOut]);

  if (!authReady) return null;
  return <SyncAuthContext.Provider value={value}>{children}</SyncAuthContext.Provider>;
}
