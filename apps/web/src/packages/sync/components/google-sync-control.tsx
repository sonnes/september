'use client';

import { useEffect, useRef } from 'react';

import { GOOGLE_CLIENT_ID, SYNC_ENABLED } from '../config';
import { loadGoogleIdentity } from '../lib/google';
import { useSyncAuth } from '../sync-context';

/**
 * Account-area control: shows the "Sign in with Google" button when signed out
 * (enabling cloud sync), and the signed-in identity + sign-out when signed in.
 * Renders nothing when sync is disabled by env.
 */
export function GoogleSyncControl() {
  const auth = useSyncAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SYNC_ENABLED || !auth || auth.user) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID as string,
          callback: (resp) => void auth.signInWithCredential(resp.credential),
        });
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [auth, auth?.user]);

  if (!SYNC_ENABLED || !auth) return null;

  if (auth.user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground truncate">
          Synced as {auth.user.email ?? auth.user.user_metadata?.full_name ?? 'your account'}
        </span>
        <button type="button" onClick={auth.signOut} className="underline underline-offset-2">
          Sign out
        </button>
      </div>
    );
  }

  return <div ref={buttonRef} />;
}
