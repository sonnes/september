import { createBrowserHistory } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';

import { App, createQueryClient } from '@september/app-ui/app';
import { loadSettings } from '@september/app-ui/services/settings';
import { countPages, getRouter } from '@/router';

import '@/styles/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

/**
 * Reads the settings once, then mounts the app over the prerendered markup of
 * the page.
 */
async function start(element: HTMLElement): Promise<void> {
  try {
    await loadSettings();
  } catch (reason) {
    // The landing page and Help still work when this browser denies storage.
    console.error('September could not read its settings.', reason);
  }
  const router = getRouter(createBrowserHistory());
  countPages(router);
  createRoot(element).render(<App router={router} queryClient={createQueryClient()} />);
}

void start(root);
