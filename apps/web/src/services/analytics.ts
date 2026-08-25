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

/** Pages seen before the script arrived. Sent in order once it has. */
const waiting: string[] = [];
let listening = false;

function tracker(): Tracker | undefined {
  return (window as { umami?: Tracker }).umami;
}

function send(found: Tracker, path: string): void {
  found.track((props) => ({ ...props, url: path, title: path }));
}

/**
 * Counts one page, under the path given and nothing else.
 *
 * The title travels with the page view, and a September title carries the same
 * name the address does, so it is replaced too.
 *
 * The script is deferred and the landing route resolves the moment the app
 * mounts, with no data to wait for, so the first page of a visit can arrive
 * before the tracker does. Such a page waits for the window to load, by which
 * time a deferred script has run. A page seen after that with no tracker in
 * place is dropped where it stands: the script was never configured, or it was
 * blocked, and either way it is not coming.
 */
export function countPage(path: string): void {
  const found = tracker();
  if (found) return send(found, path);

  if (document.readyState === 'complete') return;

  waiting.push(path);
  if (listening) return;

  listening = true;
  addEventListener(
    'load',
    () => {
      const late = tracker();
      if (late) waiting.forEach((one) => send(late, one));
      waiting.length = 0;
    },
    { once: true }
  );
}
