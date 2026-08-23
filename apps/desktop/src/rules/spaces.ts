/**
 * The pure rules of a space and its transcript. A test reads them here,
 * without a renderer.
 */

/** The title of the first space. The web app seeds the same one. */
export const FIRST_SPACE_TITLE = "General";

const LATER_SPACE_TITLE = "New space";

/**
 * The words that make up a name for a space that the user did not name.
 *
 * Three of them name a space: `Amber Cedar Meadow`. They are plain, easy to
 * say, and easy to tell one from another, because the user reads the name in
 * a tab that is one line high. They say nothing about the health of the user.
 *
 * Every word is lowercase and holds letters only, so `isAutoTitle` can read
 * the words back out of a slug.
 */
const NAME_WORDS: readonly string[] = [
  "amber", "anchor", "autumn", "basil", "breeze", "cedar",
  "cotton", "daisy", "ember", "fable", "garden", "harbor",
  "ivory", "jasmine", "kite", "lantern", "meadow", "olive",
  "pebble", "quartz", "ribbon", "sable", "tulip", "violet",
  "willow", "yarrow",
];

/** How many names to try before the numbered title takes over. */
const NAME_TRIES = 50;

/** Three words of `NAME_WORDS`, each one different, in title case. */
function threeWords(pick: (limit: number) => number): string {
  const pool = [...NAME_WORDS];
  const words: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const [word] = pool.splice(pick(pool.length), 1);
    words.push(word[0].toUpperCase() + word.slice(1));
  }
  return words.join(" ");
}

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
 * The first space is `General`. A later space takes three words, which read
 * better in a tab than `New space 4` and tell one space from another. A model
 * replaces the name when the space says what it is for.
 *
 * `pick` gives the index of the next word. A test gives its own, so the name
 * is the same in every run.
 */
export function newSpaceTitle(
  existing: readonly (string | null | undefined)[],
  pick: (limit: number) => number = (limit) => Math.floor(Math.random() * limit),
): string {
  const free = (title: string) => freeTitle(title, existing) !== null;

  if (free(FIRST_SPACE_TITLE)) return FIRST_SPACE_TITLE;

  for (let tries = 0; tries < NAME_TRIES; tries += 1) {
    const title = threeWords(pick);
    if (free(title)) return title;
  }

  // Every name was taken. The number keeps the slugs apart.
  if (free(LATER_SPACE_TITLE)) return LATER_SPACE_TITLE;
  for (let count = 2; ; count += 1) {
    const title = `${LATER_SPACE_TITLE} ${count}`;
    if (free(title)) return title;
  }
}

/** A space opens in one of two modes, and the address holds which one. */
export type SpaceMode = "talk" | "notes";

/**
 * Where a console writes. Two of them are the modes of a space; the third is
 * the screen that makes one, which has no space to write into yet.
 *
 * This is not `SpaceMode`. That type is the mode a space is *kept* in, which
 * `spaceModeFrom` and `spaceParams` both read, and a screen that no space
 * exists for must never be written into that setting.
 */
export type ComposerMode = SpaceMode | "new";

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
    placeholder: "Write a message...",
    speaks: true,
  },
  notes: {
    label: "Add to note",
    field: "Words for the note",
    placeholder: "Write words to add to this note...",
    speaks: false,
  },
  new: {
    label: "Create space",
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
  return modes[slug] === "notes" ? "notes" : "talk";
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
 * Whether the title is one September wrote, and not one the user typed.
 *
 * A model renames a space after the first message. A title the user chose is
 * the user's, so the model must leave it alone.
 */
export function isAutoTitle(title: string | null | undefined): boolean {
  const slug = spaceSlug(title);
  if (/^(general|new-space(-\d+)?)$/.test(slug)) return true;

  // A name of three words is one that September made up too.
  const words = slug.split("-");
  return words.length === 3 && words.every((word) => NAME_WORDS.includes(word));
}

/**
 * The frame that the create screen gives the suggestion engine.
 *
 * A new space holds no context yet — writing it is the point of the screen.
 * With none, the completion lane answers as if the user were talking to
 * somebody, because `OPENING_PROMPT` and `COMPLETION_PROMPT` are written for a
 * conversation. This line stands in for the context of the space, so the model
 * offers ways to finish a description instead.
 */
export const NEW_SPACE_CONTEXT =
  "I am describing a new space in my communication app: who I speak to here, and what we talk about.";

/**
 * The openers on the new-space screen.
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

/** How long a model may take before the screen stops waiting for it. */
export const MODEL_WAIT_MS = 20_000;

/** The three writes that a new space needs. */
export type CreateStepId = "space" | "name" | "phrases";

export type StepState = "waiting" | "running" | "done" | "skipped" | "failed";

export interface CreateStep {
  id: CreateStepId;
  label: string;
  state: StepState;
  /** Why a step did not run, or did not land. */
  note?: string;
}

export interface CreateProgress {
  /** How far the run has reached. */
  at: "space" | "models" | "done";
  /** A writing service is connected. Without one, no model step runs. */
  hasWriting: boolean;
  /** Why a step did not land, by step. */
  failed?: Partial<Record<CreateStepId, string>>;
}

const NO_SERVICE = "Skipped — no writing service is connected";

const STEP_LABELS: Record<CreateStepId, string> = {
  space: "Making the space",
  name: "Naming it",
  phrases: "Writing the first phrases",
};

const STEP_ORDER: readonly CreateStepId[] = ["space", "name", "phrases"];

/**
 * What the screen shows while a new space is made.
 *
 * The user waits on two model calls, so the work must be on the screen in
 * words while it runs, and not in the label of a button that a reader never
 * hears. A step that cannot run says why: a screen that named work it was not
 * doing would be lying to a user with no writing service.
 */
export function createSteps(progress: CreateProgress): CreateStep[] {
  const { at, hasWriting, failed = {} } = progress;

  const stateOf = (id: CreateStepId): Pick<CreateStep, "state" | "note"> => {
    if (failed[id]) return { state: "failed", note: failed[id] };

    if (id === "space") return { state: at === "space" ? "running" : "done" };

    // The two model steps run together, and neither runs at all without a
    // service to run it.
    if (!hasWriting) return { state: "skipped", note: NO_SERVICE };
    if (at === "space") return { state: "waiting" };

    return { state: at === "models" ? "running" : "done" };
  };

  return STEP_ORDER.map((id) => ({
    id,
    label: STEP_LABELS[id],
    ...stateOf(id),
  }));
}
