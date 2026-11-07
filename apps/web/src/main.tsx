import { createBrowserHistory } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';

import { App, createQueryClient } from '@september/app-ui/app';
import { isPublicPath } from '@/public-pages';
import { countPages, getRouter, settingsReady } from '@/router';

import '@/styles/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

/**
 * Mounts the app over the prerendered markup of the page. A public page draws
 * at once. An app page reads the settings first.
 */
async function start(element: HTMLElement): Promise<void> {
  if (!isPublicPath(window.location.pathname)) await settingsReady();
  const router = getRouter(createBrowserHistory());
  countPages(router);
  createRoot(element).render(<App router={router} queryClient={createQueryClient()} />);
}

void start(root);
