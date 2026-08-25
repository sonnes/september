/**
 * The rules that put prerendered markup into the built shell.
 *
 * `index.html` ships to the browser with an empty root. The build fills that
 * root with the pages that a build machine can draw, so the first paint and
 * every crawler read the words without running the application.
 */

import { HELP_GUIDES } from '@september/core/rules/help';

const ROOT = /(<div id="root"[^>]*>)(<\/div>)/;
const TITLE = /<title>[\s\S]*?<\/title>/;

/**
 * The pages the build draws.
 *
 * Two kinds of page qualify, and only these two. The landing page, which is
 * read by people who have not decided to use anything yet. And Help, which is
 * written from pure rules in `@september/core/rules/help`, sits outside the
 * finished-setup guard, and is looked for by name in a search engine by
 * someone stuck part-way through a task.
 *
 * Every other screen reads IndexedDB. A build machine has none, so there is
 * nothing there for it to draw.
 */
export const PRERENDERED_PATHS: string[] = [
  '/',
  '/help',
  ...HELP_GUIDES.map((guide) => `/help/${guide.slug}`),
];

/**
 * Where the markup for a path is written, under `dist`.
 *
 * `/` is the shell both hosts already serve from the root. Every other page is
 * a folder index, because that is the one shape Vercel and the Worker both
 * answer with from the filesystem, at the slashless path the app's own links
 * use. Neither host needs a rule per page: a file that exists answers for
 * itself, and everything else falls through to `app.html`.
 */
export function prerenderedFile(path: string): string {
  return path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`;
}

/** The shell with the markup inside its root element. */
export function injectMarkup(shell: string, markup: string): string {
  if (!ROOT.test(shell)) {
    throw new Error('The shell has no empty root element to prerender into');
  }
  return shell.replace(ROOT, `$1${markup}$2`);
}

/**
 * The title the page rendered, moved into the head of the shell.
 *
 * React puts a `<title>` in the head of a running page, but a build renders
 * markup for the body and leaves the element where it stands. A crawler reads
 * the head, so the title has to travel.
 */
export function hoistTitle(
  shell: string,
  markup: string
): { shell: string; markup: string } {
  const found = markup.match(TITLE);
  if (!found) return { shell, markup };

  return {
    shell: shell.replace(TITLE, found[0]),
    markup: markup.replace(TITLE, ''),
  };
}
