/**
 * Counting pages, on the web only.
 *
 * The tracker is loaded by the built HTML with automatic tracking turned off,
 * so nothing is reported unless this asks for it. That is deliberate: left to
 * itself the script reads the address and the title of every page the user
 * moves to, and both name the person the user is talking to.
 *
 * The desktop app never loads a tracker at all.
 */

interface PageView {
  url: string;
  title: string;
}

interface Tracker {
  track: (edit: (props: PageView) => PageView) => void;
}

/**
 * Counts one page, under the path given and nothing else.
 *
 * The title travels with the page view, and a September title carries the same
 * name the address does, so it is replaced too.
 */
export function countPage(path: string): void {
  const tracker = (window as { umami?: Tracker }).umami;
  if (!tracker) return;

  tracker.track((props) => ({ ...props, url: path, title: path }));
}
