/**
 * How the stage of a presentation looks: the seven tones, the face and size of
 * a chunk, and the font fit. The live stage and the video frame read the same
 * numbers.
 */

export type PresentToneKey =
  | "indigo"
  | "ink"
  | "paper"
  | "cream"
  | "sage"
  | "blush"
  | "sky";

/**
 * Keycap tones are the system: Noto Sans on the app's own colours. Reading
 * tones are paper tints with a serif display face, for a long story read at a
 * distance.
 */
export type PresentToneFamily = "keycap" | "reading";

export interface PresentTone {
  key: PresentToneKey;
  name: string;
  family: PresentToneFamily;
  /** The whole stage, and the whole video frame. */
  background: string;
  /** The colour of a display chunk. */
  display: string;
  /** The colour of a support chunk. */
  support: string;
  /** The word being spoken now. */
  accent: string;
  /** The corner signature: the Sep keycap, or the ink wordmark. */
  mark: "keycap" | "wordmark";
}

/**
 * Seven tones in one picker. The first three are the app's own colours; the
 * last four are paper tints for reading.
 */
export const PRESENT_TONES: PresentTone[] = [
  {
    key: "indigo",
    name: "Indigo",
    family: "keycap",
    background: "#4f46e5",
    display: "#ffffff",
    support: "#e0e7ff",
    accent: "#c7d2fe",
    mark: "keycap",
  },
  {
    key: "ink",
    name: "Ink",
    family: "keycap",
    background: "#09090b",
    display: "#fafafa",
    support: "#d4d4d8",
    accent: "#a5b4fc",
    mark: "keycap",
  },
  {
    key: "paper",
    name: "Paper",
    family: "keycap",
    background: "#ffffff",
    display: "#18181b",
    support: "#3f3f46",
    accent: "#4f46e5",
    mark: "keycap",
  },
  {
    key: "cream",
    name: "Cream",
    family: "reading",
    background: "#faf6ec",
    display: "#1c1b18",
    support: "#44403c",
    accent: "#b45309",
    mark: "wordmark",
  },
  {
    key: "sage",
    name: "Sage",
    family: "reading",
    background: "#eef4ee",
    display: "#1c1b18",
    support: "#3f3f46",
    accent: "#047857",
    mark: "wordmark",
  },
  {
    key: "blush",
    name: "Blush",
    family: "reading",
    background: "#faf0f0",
    display: "#1c1b18",
    support: "#44403c",
    accent: "#be123c",
    mark: "wordmark",
  },
  {
    key: "sky",
    name: "Sky",
    family: "reading",
    background: "#eef4fa",
    display: "#1c1b18",
    support: "#3f3f46",
    accent: "#0369a1",
    mark: "wordmark",
  },
];

export const DEFAULT_TONE: PresentToneKey = "indigo";

const TONE_BY_KEY = new Map(PRESENT_TONES.map((tone) => [tone.key, tone]));

/** The tone a key names. A key that no longer exists falls back. */
export function presentTone(key: PresentToneKey): PresentTone {
  return TONE_BY_KEY.get(key) ?? TONE_BY_KEY.get(DEFAULT_TONE)!;
}

/** A chunk opens a section, or continues one. */
export const CHUNK_ROLES = ["display", "support"] as const;
export type ChunkRole = (typeof CHUNK_ROLES)[number];

export interface RoleSpec {
  fontFamily: string;
  fontWeight: number;
  lineHeightRatio: number;
  /** The largest font size, as a share of the stage width. */
  maxFontRatio: number;
  /** The smallest font size, as a share of the stage width. */
  minFontRatio: number;
  /** The share of the stage height the words may fill. */
  boxHeightRatio: number;
}

const NOTO = '"Noto Sans", sans-serif';
const FRAUNCES = '"Fraunces Variable", "Fraunces", serif';

/**
 * The face and the size of a chunk.
 *
 * Only the paper tints take the serif, and only for a display chunk. Support
 * text stays in Noto Sans everywhere, because it carries the sentences a
 * partner reads.
 */
export function roleSpec(role: ChunkRole, family: PresentToneFamily): RoleSpec {
  if (role === "display") {
    return {
      fontFamily: family === "reading" ? FRAUNCES : NOTO,
      fontWeight: family === "reading" ? 550 : 700,
      lineHeightRatio: 1.08,
      maxFontRatio: 0.28,
      minFontRatio: 0.055,
      boxHeightRatio: 0.62,
    };
  }

  return {
    fontFamily: NOTO,
    fontWeight: 500,
    lineHeightRatio: 1.35,
    maxFontRatio: 0.095,
    minFontRatio: 0.03,
    boxHeightRatio: 0.56,
  };
}

/** A word already spoken stays on the stage, dimmed. */
export const SPOKEN_OPACITY = 0.55;
/** A word not yet spoken. */
export const UNSPOKEN_OPACITY = 0.88;

/** The empty margin down each side of the stage. */
export const STAGE_PADDING_RATIO = 0.07;

/** About how wide one glyph is, as a share of the font size. */
const GLYPH_WIDTH_RATIO = 0.52;

/**
 * How wide a wide glyph is, such as a bold capital, as a share of the font
 * size. The longest word must fit on one line at this width.
 */
const WIDE_GLYPH_RATIO = 0.62;

/**
 * The font size of a chunk, as a share of the stage width.
 *
 * The stage is one colour and one thought, so the words take as much of it as
 * they can. `aspect` is the stage height over its width, which is why a Mac in
 * landscape and a 9:16 video frame reach different sizes from the same words.
 */
export function chunkFontRatio(
  text: string,
  role: ChunkRole,
  aspect: number,
): number {
  const spec = roleSpec(role, "keycap");
  const characters = text.trim().length;
  if (!characters || aspect <= 0) return spec.maxFontRatio;

  const usableWidth = 1 - STAGE_PADDING_RATIO * 2;
  const usableHeight = spec.boxHeightRatio * aspect;
  // Lines of text grow with the font size, and so does the height of each
  // line, so the height the words need grows with its square.
  const fitted = Math.sqrt(
    (usableHeight * usableWidth) /
      (characters * GLYPH_WIDTH_RATIO * spec.lineHeightRatio),
  );
  // A word does not break, so the longest word must fit across the stage.
  const words = text.trim().split(/\s+/);
  const longest = Math.max(...words.map((word) => word.length));
  const wordFit = usableWidth / (longest * WIDE_GLYPH_RATIO);

  // Words wrap at their ends, which leaves room unused at the end of a line.
  // The size comes down until the wrapped lines fit the height.
  let ratio = Math.min(spec.maxFontRatio, fitted, wordFit);
  while (
    ratio > spec.minFontRatio &&
    wrappedLines(words, usableWidth / (ratio * GLYPH_WIDTH_RATIO)) * spec.lineHeightRatio * ratio >
      usableHeight
  ) {
    ratio *= 0.96;
  }
  return Math.max(spec.minFontRatio, ratio);
}

/** The lines that words take when they wrap at word ends. */
function wrappedLines(words: readonly string[], room: number): number {
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const need = used === 0 ? word.length : used + 1 + word.length;
    if (need > room && used > 0) {
      lines += 1;
      used = word.length;
    } else {
      used = need;
    }
  }
  return lines;
}
