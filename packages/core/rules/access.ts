/**
 * The access profile: how a person chooses things, and how large and how
 * fast the screen must be for them. Setup asks for it first, Settings changes
 * it, and every screen reads the reach it gives.
 */

export type InputMethod = "touch" | "mouse" | "keyboard" | "switch" | "eyes";
export type TextSize = "standard" | "large" | "largest";
export type Contrast = "standard" | "high";
export type Motion = "full" | "reduced";
export type Theme = "light" | "dark" | "system";
export type Sound = "on" | "off";

export interface AccessProfile {
  input: InputMethod;
  textSize: TextSize;
  contrast: Contrast;
  motion: Motion;
  theme: Theme;
  /** The click that answers a press. */
  sound: Sound;
  /** The gaze time that selects a tile. The input method sets it when absent. */
  dwellMs?: number;
  /** The time the scan stays on one step. The input method sets it when absent. */
  scanStepMs?: number;
}

export const INPUT_METHODS: readonly {
  value: InputMethod;
  label: string;
  description: string;
}[] = [
  { value: "touch", label: "Touch", description: "Tap the screen." },
  { value: "mouse", label: "Mouse or trackpad", description: "Point and click." },
  { value: "keyboard", label: "Keyboard", description: "Use Tab and Enter." },
  { value: "switch", label: "Switch", description: "One or two buttons. The screen scans." },
  { value: "eyes", label: "Eyes", description: "Look at a key and hold your gaze." },
];

export const DEFAULT_ACCESS: AccessProfile = {
  input: "touch",
  textSize: "standard",
  contrast: "standard",
  motion: "full",
  theme: "light",
  sound: "on",
};

/** What the profile asks of every screen. */
export interface Reach {
  /** The smallest side of a target. */
  targetPx: number;
  /** The space between two targets. */
  gapPx: number;
  /** The size of a word on a tile. */
  wordPx: number;
  /** The text size as a scale: 1 for standard. Every other text grows by it. */
  textScale: number;
  /** The gaze time that selects, or null when the gaze does not select. */
  dwellMs: number | null;
  /** The time of one scan step, or null when the screen does not scan. */
  scanStepMs: number | null;
  /** The most stripes that show at once. */
  stripes: number;
  /** The most words in a slice before its end key. */
  slice: number;
  motion: Motion;
}

type Base = Omit<Reach, "textScale">;

// Touch keeps the numbers of today: six stripes and slices of six words.
const TOUCH: Base = {
  targetPx: 48,
  gapPx: 8,
  wordPx: 16,
  dwellMs: null,
  scanStepMs: null,
  stripes: 6,
  slice: 6,
  motion: "full",
};

const BASE: Record<InputMethod, Base> = {
  touch: TOUCH,
  mouse: TOUCH,
  keyboard: TOUCH,
  switch: {
    targetPx: 64,
    gapPx: 16,
    wordPx: 20,
    dwellMs: null,
    scanStepMs: 1200,
    stripes: 4,
    slice: 4,
    motion: "reduced",
  },
  eyes: {
    targetPx: 88,
    gapPx: 24,
    wordPx: 22,
    dwellMs: 800,
    scanStepMs: null,
    stripes: 4,
    slice: 4,
    motion: "reduced",
  },
};

const TEXT_SCALE: Record<TextSize, number> = {
  standard: 1,
  large: 1.25,
  largest: 1.5,
};

export function reachFor(profile: AccessProfile): Reach {
  const base = BASE[profile.input];
  const scale = TEXT_SCALE[profile.textSize];
  return {
    ...base,
    wordPx: Math.round(base.wordPx * scale),
    textScale: scale,
    dwellMs: base.dwellMs === null ? null : (profile.dwellMs ?? base.dwellMs),
    scanStepMs:
      base.scanStepMs === null ? null : (profile.scanStepMs ?? base.scanStepMs),
    motion: profile.motion === "reduced" ? "reduced" : base.motion,
  };
}

/** Whether the screen shows the dark theme. */
export function isDark(theme: Theme, systemDark: boolean): boolean {
  return theme === "dark" || (theme === "system" && systemDark);
}

/** A dwell or a scan step shorter than this cannot be a choice. */
export const TIME_MIN_MS = 300;
/**
 * The longest dwell or scan step: 30 seconds. WCAG 2.2.1 asks that a person
 * can make a time limit ten times as long as the default. The slowest default
 * is the 1.2 second scan step.
 */
export const TIME_MAX_MS = 30_000;

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined;

const time = (value: unknown): number | undefined =>
  typeof value === "number" && value >= TIME_MIN_MS && value <= TIME_MAX_MS
    ? value
    : undefined;

/** The saved profile, with each field checked. A bad field takes the default. */
export function parseAccess(value: unknown): AccessProfile {
  if (!value || typeof value !== "object") return DEFAULT_ACCESS;
  const saved = value as Record<string, unknown>;
  const profile: AccessProfile = {
    input:
      oneOf(saved.input, INPUT_METHODS.map((one) => one.value)) ??
      DEFAULT_ACCESS.input,
    textSize:
      oneOf(saved.textSize, ["standard", "large", "largest"] as const) ??
      DEFAULT_ACCESS.textSize,
    contrast:
      oneOf(saved.contrast, ["standard", "high"] as const) ?? DEFAULT_ACCESS.contrast,
    motion: oneOf(saved.motion, ["full", "reduced"] as const) ?? DEFAULT_ACCESS.motion,
    theme: oneOf(saved.theme, ["light", "dark", "system"] as const) ?? DEFAULT_ACCESS.theme,
    sound: oneOf(saved.sound, ["on", "off"] as const) ?? DEFAULT_ACCESS.sound,
  };
  const dwellMs = time(saved.dwellMs);
  const scanStepMs = time(saved.scanStepMs);
  if (dwellMs !== undefined) profile.dwellMs = dwellMs;
  if (scanStepMs !== undefined) profile.scanStepMs = scanStepMs;
  return profile;
}
