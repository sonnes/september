import { createRoot } from 'react-dom/client';

import '@fontsource/lexend/700.css';
import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/500.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import { App } from '@/app';
import { getRouter } from '@/router';

import '@/styles/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Missing root element');

// `/` is served with the landing page already drawn into the root, so a
// reader sees it before this bundle arrives. React then mounts over it: the
// first commit replaces the static markup with the same page, now working.
createRoot(root).render(<App router={getRouter()} />);
