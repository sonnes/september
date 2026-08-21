/**
 * The pure rules of a space and its transcript. A test reads them here,
 * without a renderer.
 */

/** The title of the first space. The web app seeds the same one. */
export const FIRST_SPACE_TITLE = "General";

const LATER_SPACE_TITLE = "New space";

/** How many spoken messages one transcript page shows. */
export const TRANSCRIPT_PAGE_SIZE = 8;

/** The URL name of a space. It carries no identifier. */
export function spaceSlug(title: string | null | undefined): string {
  return (
    title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "space"
  );
}

/** The space that a slug names, or nothing when no title matches. */
export function spaceFromSlug<T extends { title?: string | null }>(
  slug: string,
  spaces: readonly T[],
): T | undefined {
  return spaces.find((space) => spaceSlug(space.title) === slug);
}

/**
 * A title that no other space holds.
 *
 * Two spaces with one title share one slug, and the address then opens the
 * wrong one. The number keeps the slugs apart.
 */
export function newSpaceTitle(
  existing: readonly (string | null | undefined)[],
): string {
  const taken = new Set(existing.map((title) => spaceSlug(title)));
  const free = (title: string) => !taken.has(spaceSlug(title));

  if (free(FIRST_SPACE_TITLE)) return FIRST_SPACE_TITLE;
  if (free(LATER_SPACE_TITLE)) return LATER_SPACE_TITLE;

  for (let count = 2; ; count += 1) {
    const title = `${LATER_SPACE_TITLE} ${count}`;
    if (free(title)) return title;
  }
}

/** The spaces whose title holds the words that the user typed. */
export function filterSpaces<T extends { title?: string | null }>(
  spaces: readonly T[],
  query: string,
): T[] {
  const words = query.trim().toLowerCase();
  if (!words) return [...spaces];

  return spaces.filter((space) => space.title?.toLowerCase().includes(words));
}

const UNITS: [number, Intl.RelativeTimeFormatUnit, number][] = [
  [60, "second", 1],
  [3600, "minute", 60],
  [86_400, "hour", 3600],
  [604_800, "day", 86_400],
  [2_592_000, "week", 604_800],
  [31_536_000, "month", 2_592_000],
  [Infinity, "year", 31_536_000],
];

/**
 * How long ago a moment was, in words, for example `2 hours ago`.
 *
 * ponytail: `Intl.RelativeTimeFormat` is in the platform, so this needs no
 * date library. The `now` argument keeps the function pure for a test.
 */
export function timeAgo(at: number, now: number = Date.now()): string {
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const seconds = Math.round((at - now) / 1000);
  const [, unit, divisor] =
    UNITS.find(([limit]) => Math.abs(seconds) < limit) ?? UNITS[UNITS.length - 1];

  return format.format(Math.round(seconds / divisor), unit);
}

export interface TranscriptPage<T> {
  /** The number of pages. It is 1 even when the space is empty. */
  pageCount: number;
  /** The page, held inside the range. Page 0 is the newest page. */
  page: number;
  slice: T[];
}

/**
 * Splits the messages of a space into pages, newest first. Page 0 holds the
 * most recent messages. A higher page walks back through older ones.
 */
export function transcriptPage<T>(
  rows: readonly T[],
  page: number,
  size: number = TRANSCRIPT_PAGE_SIZE,
): TranscriptPage<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const held = Math.min(Math.max(page, 0), pageCount - 1);
  const end = rows.length - held * size;
  return { pageCount, page: held, slice: rows.slice(Math.max(0, end - size), end) };
}

/** The text without the word at the end. */
export function deleteLastWord(text: string): string {
  const trimmed = text.replace(/\s+$/, "");
  const start = trimmed.search(/\S+$/);
  return start > 0 ? trimmed.slice(0, start) : "";
}

/**
 * Whether the title is one September wrote, and not one the user typed.
 *
 * A model renames a space after the first message. A title the user chose is
 * the user's, so the model must leave it alone.
 */
export function isAutoTitle(title: string | null | undefined): boolean {
  return /^(general|new-space(-\d+)?)$/.test(spaceSlug(title));
}
