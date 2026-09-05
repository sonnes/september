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
 * The landing page, legal notices, and Help qualify. These public pages sit
 * outside the finished-setup guard and do not need browser storage.
 *
 * Every other screen reads IndexedDB. A build machine has none, so there is
 * nothing there for it to draw.
 */
export const PRERENDERED_PATHS: string[] = [
  '/',
  '/privacy-policy',
  '/terms-of-service',
  '/help',
  ...HELP_GUIDES.map(guide => `/help/${guide.slug}`),
];

/**
 * Where the markup for a path is written, under `dist`.
 *
 * `/` is served from the root. Every other page is a folder index that Vercel
 * serves at the slashless path used by the app. Missing files fall through to
 * `app.html`.
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
export function hoistTitle(shell: string, markup: string): { shell: string; markup: string } {
  const found = markup.match(TITLE);
  if (!found) return { shell, markup };

  return {
    shell: shell.replace(TITLE, found[0]),
    markup: markup.replace(TITLE, ''),
  };
}

/** Where the analytics script lives, and which site it counts. */
export interface Analytics {
  src: string;
  websiteId: string;
}

/** A value written into an attribute, with no way out of it. */
function attribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * The shell of a built page, with the counter in its head.
 *
 * Automatic tracking stays off. The script would otherwise read the address
 * and the title of every page the user moves to, and in September both name
 * the person the user is talking to. `services/analytics` reports each page
 * instead, under a path that names no one.
 *
 * A build with nothing configured writes nothing, so a fork and a local build
 * report to no one.
 */
export function withAnalytics(shell: string, analytics: Analytics | null): string {
  if (!analytics?.src || !analytics.websiteId) return shell;

  // `crossorigin` is not decoration: `public/_headers` and `vercel.json` make
  // the site cross-origin isolated for ffmpeg.wasm, and `require-corp` drops a
  // cross-origin script that arrives without a resource policy. Over CORS it
  // arrives.
  const script = [
    `<script defer crossorigin="anonymous" src="${attribute(analytics.src)}"`,
    ` data-website-id="${attribute(analytics.websiteId)}"`,
    ' data-auto-track="false"></script>',
  ].join('');

  return shell.replace('</head>', `${script}</head>`);
}

export interface PublicPage {
  title: string;
  heading: string;
  description: string;
  url: string;
  image: string;
  alt: string;
}

/** Only public, storage-independent content may enter a shared card. */
export function publicPage(path: string): PublicPage {
  let heading: string;
  let description: string;
  let title: string;
  const guide = HELP_GUIDES.find(guide => path === `/help/${guide.slug}`);
  if (guide) {
    heading = guide.title;
    description = guide.summary;
    title = `${heading} · Help · September`;
  } else {
    const pages: Record<string, [string, string]> = {
      '/': [
        'Faster Communication, Fewer Keystrokes',
        'A communication assistant for people living with ALS, MND, and other speech and motor difficulties.',
      ],
      '/help': [
        'Help',
        'Learn to set up September, speak messages, save phrases, and choose a voice.',
      ],
      '/privacy-policy': [
        'Privacy Policy',
        'How September stores your data, uses optional providers, and protects your privacy.',
      ],
      '/terms-of-service': [
        'Terms of Service',
        'The terms for using September, its MIT license, and optional third-party services.',
      ],
    };
    if (!pages[path]) throw new Error(`No public page: ${path}`);
    [heading, description] = pages[path];
    title =
      path === '/'
        ? 'September — faster communication, fewer keystrokes'
        : `${heading} · September`;
  }
  return {
    title,
    heading,
    description,
    url: `https://september.to${path}`,
    image: path === '/' ? 'og.png' : `og${path}.png`,
    alt: `September — ${heading}. White lettering on an indigo card.`,
  };
}

/** Replace the shell defaults before crawlers see a public page. */
export function withPageMetadata(shell: string, page: PublicPage): string {
  const values: Record<string, string> = {
    description: page.description,
    'og:url': page.url,
    'og:title': page.title,
    'og:description': page.description,
    'og:image': `https://september.to/${page.image}`,
    'og:image:alt': page.alt,
    'twitter:title': page.title,
    'twitter:description': page.description,
    'twitter:image': `https://september.to/${page.image}`,
    'twitter:image:alt': page.alt,
  };
  const updated = shell.replace(/<meta\s[^>]*>/g, tag => {
    const key = tag.match(/(?:property|name)="([^"]+)"/)?.[1];
    return key && key in values
      ? tag.replace(/content="[^"]*"/, () => `content="${attribute(values[key])}"`)
      : tag;
  });
  return updated.replace(
    '</head>',
    `<link rel="canonical" href="${attribute(page.url)}" /></head>`
  );
}
