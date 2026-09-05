import { renderToStaticMarkup } from 'react-dom/server';

import { createMemoryHistory } from '@tanstack/react-router';

import { App } from '@/app';
import { getRouter } from '@/router';

export {
  PRERENDERED_PATHS,
  hoistTitle,
  injectMarkup,
  prerenderedFile,
  withAnalytics,
  publicPage,
  withPageMetadata,
} from '@/rules/prerender';

/**
 * One page as markup.
 *
 * The build calls this for each path in `PRERENDERED_PATHS` and writes the
 * result into its own file. Nothing else can be drawn here: every other screen
 * reads IndexedDB, which no build machine has.
 *
 * The markup is static, and the browser mounts over it rather than hydrating
 * it. Hydration would need the router's resolved matches to cross into the
 * page as well, and these pages are read far more often than they are used:
 * what they owe a reader is words without JavaScript, and a first paint that
 * does not wait for a bundle.
 */
export async function renderPage(path: string): Promise<string> {
  const router = getRouter(createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  return renderToStaticMarkup(<App router={router} />);
}
