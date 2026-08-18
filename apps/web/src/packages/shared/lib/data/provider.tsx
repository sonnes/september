'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { type UnlistenFn, listen } from '@tauri-apps/api/event';

import { openDesktopExternalUrl } from './external-client';
import {
  createDataQueryClient,
  notifyCollectionChanged,
  subscribeCollectionChanges,
} from './query';
import { isDesktopRuntime } from './runtime';

interface RecordsChangedPayload {
  collections: string[];
}

export function DataQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createDataQueryClient);

  useEffect(
    () =>
      subscribeCollectionChanges(queryKey => {
        void queryClient.invalidateQueries({ queryKey });
      }),
    [queryClient]
  );

  useEffect(() => {
    if (!isDesktopRuntime()) return;

    let disposed = false;
    let unlistenRecords: UnlistenFn | undefined;
    let unlistenFiles: UnlistenFn | undefined;

    void listen<RecordsChangedPayload>('september://records-changed', event => {
      event.payload.collections.forEach(notifyCollectionChanged);
    }).then(unlisten => {
      if (disposed) unlisten();
      else unlistenRecords = unlisten;
    });

    void listen('september://files-changed', () => {
      notifyCollectionChanged('audio-file-aliases');
    }).then(unlisten => {
      if (disposed) unlisten();
      else unlistenFiles = unlisten;
    });

    return () => {
      disposed = true;
      unlistenRecords?.();
      unlistenFiles?.();
    };
  }, []);

  useEffect(() => {
    if (!isDesktopRuntime()) return;
    const openExternalLink = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const link = element?.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      const opensOutside =
        url.protocol === 'mailto:' ||
        (link.target === '_blank' && url.origin !== window.location.origin);
      if (!opensOutside) return;
      event.preventDefault();
      void openDesktopExternalUrl(url.href).catch(error =>
        console.error('Failed to open external URL:', error)
      );
    };
    document.addEventListener('click', openExternalLink);
    return () => document.removeEventListener('click', openExternalLink);
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
