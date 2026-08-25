/**
 * What the browser tab says.
 *
 * A user of September often has several tabs of it open at once — one space
 * for one person. The tab is narrow and it truncates from the right, so the
 * part that tells two tabs apart is written first and the name of the app is
 * written last.
 */

const APP = "September";

/** The title of a page, from its parts, most particular first. */
export function documentTitle(
  ...parts: (string | null | undefined)[]
): string {
  const named = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return [...named, APP].join(" · ");
}

/**
 * The title of the public page at `/`.
 *
 * It is the one page read by someone who does not know what September is, so
 * it says so rather than naming a screen. It matches the `og:title` in
 * `index.html`, which a shared link shows.
 */
export const LANDING_TITLE = `${APP} — faster communication, fewer keystrokes`;
