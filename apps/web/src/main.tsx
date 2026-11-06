import { createRoot } from 'react-dom/client';

import '@fontsource/lexend/700.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import { loadSettings } from '@september/app-ui/services/settings';
import { App } from '@/app';
import { getRouter } from '@/router';

import '@/styles/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

/**
 * Reads the settings once, then mounts the app.
 *
 * `/` is served with the landing page already drawn into the root, so a
 * reader sees it before this bundle arrives. React then mounts over it: the
 * first commit replaces the static markup with the same page, now working.
 */
async function start(element: HTMLElement): Promise<void> {
  try {
    await loadSettings();
  } catch (reason) {
    // The landing page and Help still work when this browser denies storage.
    console.error('September could not read its settings.', reason);
  }
  createRoot(element).render(<App router={getRouter()} />);
}

void start(root);
