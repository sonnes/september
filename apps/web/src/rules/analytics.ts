/**
 * What a page view may say about where the user is.
 *
 * September counts pages on the web, and a September address often carries a
 * name: `/spaces/amma/talk` is who the user talks to, and a note slug is what
 * they mean to say. Those words are the user's. A route with a name in it is
 * reported by its shape, so the count says a space was opened without saying
 * whose.
 */

/**
 * The routes whose parameters we wrote ourselves.
 *
 * A guide slug is our own writing, and a provider is the name of a service.
 * Reporting them costs the user nothing and answers the questions worth
 * asking: which guide is read, which service is connected.
 */
const OURS = new Set(['/help/$guideSlug', '/settings/connections/$provider']);

/**
 * The path to report for a resolved route.
 *
 * `pattern` is the matched route's `fullPath` — `/spaces/$slug/talk` — which
 * is the address with the names taken out of it.
 */
export function analyticsPath(
  pattern: string | undefined,
  pathname: string,
): string {
  if (!pattern) return '/';
  if (!pattern.includes('$')) return pathname;
  return OURS.has(pattern) ? pathname : pattern;
}
