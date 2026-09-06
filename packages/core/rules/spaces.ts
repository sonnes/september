/**
 * The pure rules of a space and its transcript. A test reads them here,
 * without a renderer.
 */

/**
 * The name of a space nobody has named.
 *
 * It says what it is: a space with no name yet. The space is made before its
 * user has said a word about it, and the agent replaces this the moment they
 * do, so the name it carries in the meantime should promise nothing and read
 * as plainly in a one-line tab as it does in the list.
 */
export const UNTITLED_SPACE_TITLE = "Untitled";

/** How many spoken messages one transcript page shows. */
export const TRANSCRIPT_PAGE_SIZE = 8;

/**
 * The URL name of a title. It carries no identifier.
 *
 * A row with no title still needs an address, so the fallback names the kind
 * of row: `space` for a space, `note` for a note.
 */
export function slugify(
  title: string | null | undefined,
  fallback: string,
): string {
  return (
    title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

/** The URL name of a space. It carries no identifier. */
export const spaceSlug = (title: string | null | undefined) =>
  slugify(title, "space");

/** The space that a slug names, or nothing when no title matches. */
export function spaceFromSlug<T extends { title?: string | null }>(
  slug: string,
  spaces: readonly T[],
): T | undefined {
  return spaces.find((space) => spaceSlug(space.title) === slug);
}

/** The space a screen has been showing, and the address it found it at. */
export interface SeenSpace {
  id: string;
  slug: string;
}

/**
 * The space a screen is looking at, and whether its address is out of date.
 *
 * A title is the address of a space, so a rename moves it. The first turn of a
 * new space renames it, and the user is watching that turn happen. Reading the
 * slug alone would find nothing and send them back to the list, out of the
 * space that had just been named for them, so the screen says which space it
 * was already showing and follows that one instead.
 *
 * It follows only while the address stands still. An address that changed is
 * the user going somewhere, and somewhere that holds no space is a stale link,
 * not a space being renamed — the difference between the two is which of the
 * space and the address moved.
 */
export function spaceForSlug<T extends { id: string; title?: string | null }>(
  slug: string,
  spaces: readonly T[],
  seen?: SeenSpace | null,
): { space: T; renamed: boolean } | null {
  const named = spaceFromSlug(slug, spaces);
  if (named) return { space: named, renamed: false };
  if (!seen || seen.slug !== slug) return null;

  const held = spaces.find((space) => space.id === seen.id);
  return held ? { space: held, renamed: true } : null;
}

/**
 * The title, when no other space holds its slug, and nothing otherwise.
 *
 * Two spaces with one title share one address, and that address then opens the
 * wrong space. Three writers choose a title — the made-up name, the model, and
 * the user at the header — and each one asks here first.
 */
export function freeTitle(
  candidate: string | null | undefined,
  existing: readonly (string | null | undefined)[],
): string | null {
  // A title with no letter and no digit has no address of its own: `spaceSlug`
  // falls back to `space`, which names the kind of row and not this row.
  if (!/[a-z0-9]/i.test(candidate ?? "")) return null;

  const slug = spaceSlug(candidate);
  const taken = new Set(existing.map((title) => spaceSlug(title)));

  return taken.has(slug) ? null : candidate!;
}

/**
 * A title that no other space holds.
 *
 * `Untitled`, and then a number for each one after it. The number is what
 * keeps two addresses apart, and it counts from the names that are free rather
 * than from how many spaces there are, so a deleted space gives its number
 * back instead of leaving a gap that grows.
 *
 * A model replaces the name as soon as the space says what it is for.
 */
export function newSpaceTitle(
  existing: readonly (string | null | undefined)[],
): string {
  const free = (title: string) => freeTitle(title, existing) !== null;

  if (free(UNTITLED_SPACE_TITLE)) return UNTITLED_SPACE_TITLE;
  for (let count = 1; ; count += 1) {
    const title = `${UNTITLED_SPACE_TITLE} ${count}`;
    if (free(title)) return title;
  }
}

/** A space opens in one of three modes, and the address holds which one. */
export type SpaceMode = "talk" | "notes" | "agent";

/**
 * Which mode a space that was just made opens in.
 *
 * A space is made empty, and the agent is what fills it: it asks what the
 * space is for and writes the name, the description, and the first phrases
 * from the answer. With no writing service there is nothing to ask, so the
 * space opens where a user can use it straight away.
 */
export const newSpaceMode = (hasWriting: boolean): SpaceMode =>
  hasWriting ? "agent" : "talk";

/**
 * Whether a space has still to be told what it is for.
 *
 * A space exists from the moment the user asks for one, before it has a
 * description, a name of its own, or a word in its transcript. Its agent is
 * where it gets those, so a space with neither a description nor a turn is one
 * whose first turn is its setup.
 *
 * A space the user set up by hand has a description, and a space they have
 * already asked something has a transcript, so neither is offered a beginning
 * it is past.
 */
export function spaceNeedsSetup(
  space: { context?: string | null },
  agentRows: readonly unknown[],
): boolean {
  return !space.context?.trim() && agentRows.length === 0;
}

/**
 * Where a console writes. Three of them are the modes of a space; the fourth
 * is the first turn of a space that has still to be set up.
 *
 * This is not `SpaceMode`. That type is the mode a space is *kept* in, which
 * `spaceModeFrom` and `spaceParams` both read, and setup is a state the agent
 * passes through rather than a mode a space is left in.
 */
export type ComposerMode = SpaceMode | "setup";

export interface ComposerAction {
  /** The button under the field. */
  label: string;
  /** The name that a reader gives the field. */
  field: string;
  placeholder: string;
  /** The words leave as sound, so the sound output belongs beside them. */
  speaks: boolean;
}

const COMPOSER_ACTIONS: Record<ComposerMode, ComposerAction> = {
  talk: {
    label: "Speak",
    field: "Message",
    placeholder: "Write a message…",
    speaks: true,
  },
  notes: {
    label: "Add to note",
    field: "Words for the note",
    placeholder: "Write words to add to this note…",
    speaks: false,
  },
  agent: {
    label: "Ask",
    field: "Message to the agent",
    placeholder: "Ask about this space or request a change…",
    speaks: false,
  },
  setup: {
    label: "Set up space",
    field: "What is this space for?",
    // The placeholder says what to write. An example sentence read as words
    // the screen had already written, which is the wrong thing to show a
    // user who is deciding whether they still have to type at all.
    placeholder: "Say who you speak to here, and what you talk about.",
    speaks: false,
  },
};

/** What the console says and does in one mode. */
export const composerAction = (mode: ComposerMode): ComposerAction =>
  COMPOSER_ACTIONS[mode];

/** The mode of each space, by slug. A space that is absent opens in Talk. */
export type SpaceModes = Record<string, string>;

/**
 * The mode a space was left in.
 *
 * The slug is the key, not the identifier, so the space list can choose the
 * mode before it reads a row.
 */
export function spaceModeFrom(modes: SpaceModes, slug: string): SpaceMode {
  const mode = modes[slug];
  return mode === "notes" || mode === "agent" ? mode : "talk";
}

/** The modes with one space changed. The others keep the mode they hold. */
export function rememberSpaceMode(
  modes: SpaceModes,
  slug: string,
  mode: SpaceMode,
): SpaceModes {
  return { ...modes, [slug]: mode };
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
 * The frame that a space being set up gives the suggestion engine.
 *
 * The space holds no context yet — writing it is the point of the turn. With
 * none, the completion lane answers as if the user were talking to somebody,
 * because `OPENING_PROMPT` and `COMPLETION_PROMPT` are written for a
 * conversation. This line stands in for the context of the space, so the model
 * offers ways to finish a description instead.
 */
export const NEW_SPACE_CONTEXT =
  "I am describing a new space in my communication app: who I speak to here, and what we talk about.";

/**
 * The openers a space offers while it is being set up.
 *
 * A space is for one person, one place, or one subject, and each opener names
 * one of the three. They stop mid-sentence on purpose: the stripe and the word
 * tiles carry on from there, so a press costs the user nothing and the words
 * that follow are still their own. A finished sentence would put words in
 * their mouth, which is the one thing this screen must not do.
 */
export const NEW_SPACE_OPENERS: readonly string[] = [
  "I speak to my ",
  "I use this at ",
  "We talk about ",
];

