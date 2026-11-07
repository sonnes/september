/**
 * The settings that both apps keep, held in memory after one read.
 *
 * `loadSettings` reads them once, before the first screen. A screen then
 * reads a value at once. A change with `set` goes to the store first and to
 * the memory after the write succeeds. A change with `keep` shows at once.
 */

import { useSyncExternalStore } from "react";

import { platform } from "@platform/adapter";
import {
  DEFAULT_ANSWERS,
  savedSetupFrom,
  speechFromOlderSetup,
  type OnboardingDraft,
  type SavedSetup,
  type SetupAnswers,
} from "@september/core/rules/onboarding";
import { panelStateFrom, type PanelState } from "@september/core/rules/panel";
import { presentSettings, type PresentSettings } from "@september/core/rules/present/settings";
import { LOCAL_USER, SETTINGS } from "@september/core/rules/settings";
import { spaceModesById, type SpaceModes } from "@september/core/rules/spaces";

import type { SpeechSettings } from "@september/core/rules/voice";

export interface Setting<T> {
  get(): T;
  /** Writes the value. The held value changes only after the write succeeds. */
  set(value: T): Promise<void>;
  /**
   * Holds the value at once and writes it, for a caller that does not wait.
   * A failed write is logged, and the held value stays.
   */
  keep(value: T): void;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
}

/** One setting, read once and held. */
export function setting<T>(key: string, from: (saved: unknown) => T): Setting<T> {
  let value = from(null);
  const listeners = new Set<() => void>();
  const show = (next: T) => {
    value = next;
    for (const listener of listeners) listener();
  };
  return {
    get: () => value,
    async set(next) {
      await platform.store.putSetting(key, next);
      show(next);
    },
    keep(next) {
      show(next);
      platform.store.putSetting(key, next).catch((reason: unknown) =>
        console.error(`September did not keep the setting ${key}.`, reason),
      );
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      value = from(await platform.store.getSetting(key));
    },
  };
}

/** The value of a setting, and a new render when it changes. */
export function useSetting<T>(held: Setting<T>): T {
  return useSyncExternalStore(held.subscribe, held.get, held.get);
}

const listOf = (saved: unknown): string[] => (Array.isArray(saved) ? saved : []);
const recordOf = (saved: unknown): SpaceModes =>
  saved && typeof saved === "object" ? (saved as SpaceModes) : {};

export const setup = setting<SavedSetup | null>(SETTINGS.setup, (saved) =>
  savedSetupFrom(saved as SavedSetup | null),
);
export const panel = setting<PanelState>(SETTINGS.panel, panelStateFrom);
export const present = setting<PresentSettings>(SETTINGS.present, presentSettings);
/** The shortcut ideas the user turned down. They never come back. */
export const dismissedIdeas = setting<string[]>(SETTINGS.dismissedIdeas, listOf);
/** The mode each space was left in, by space id. */
export const spaceModes = setting<SpaceModes>(SETTINGS.spaceModes, recordOf);
/** The voices heard lately on the Voice screen, newest first. */
export const heardVoices = setting<string[]>(SETTINGS.heardVoices, listOf);
/** The voice the user chose, or null before the first choice. */
export const savedSpeech = setting<SpeechSettings | null>(
  SETTINGS.speech,
  (saved) => (saved as SpeechSettings | null) ?? null,
);

/** The held settings besides the setup. A failed read keeps the default. */
const withDefaults: Setting<unknown>[] = [
  panel,
  present,
  dismissedIdeas,
  spaceModes,
  heardVoices,
  savedSpeech,
];

let identity = { name: "", userId: LOCAL_USER };

/**
 * Reads every held setting. The bootstrap awaits this once before it renders.
 *
 * A setup that cannot be read stops the start, because a finished user who
 * sees setup again can write over their data. Each other setting that cannot
 * be read takes its default.
 */
export async function loadSettings(): Promise<void> {
  const unread = new Set<Setting<unknown>>();
  const [found] = await Promise.all([
    platform.device.identity(),
    setup.load(),
    ...withDefaults.map((held) =>
      held.load().catch((reason: unknown) => {
        unread.add(held);
        console.error("September could not read a setting, so it uses the default.", reason);
      }),
    ),
  ]);
  identity = { name: found.name, userId: found.userId ?? LOCAL_USER };
  await keySpaceModesById();
  if (!unread.has(savedSpeech)) await keepOlderSetupVoice();
}

/** Moves the voice of a setup saved before setup wrote the speech settings. */
async function keepOlderSetupVoice(): Promise<void> {
  if (savedSpeech.get()) return;
  const speech = speechFromOlderSetup(await platform.store.getSetting(SETTINGS.setup));
  if (speech) await savedSpeech.set(speech);
}

/** Moves a setting that keys the modes by slug, from an older app or backup, to space ids. */
async function keySpaceModesById(): Promise<void> {
  const modes = spaceModes.get();
  if (Object.keys(modes).length === 0) return;
  const byId = spaceModesById(modes, await platform.store.listSpaces(currentUserId()));
  if (JSON.stringify(byId) !== JSON.stringify(modes)) await spaceModes.set(byId);
}

/** The name the system knows for the person, or nothing. */
export const systemName = (): string => identity.name;

export const currentSetup = (): SavedSetup | null => setup.get();
export const subscribeSetup = setup.subscribe;
export const useSetup = (): SavedSetup | null => useSetting(setup);

/**
 * The owner of every space and every message.
 *
 * Setup freezes the identifier, so a renamed account keeps its spaces.
 */
export function currentUserId(): string {
  return setup.get()?.id ?? identity.userId;
}

let setupWrite: Promise<unknown> = Promise.resolve();

/** Changes some setup answers. Writes run one after the other. */
export function updateSetup(patch: Partial<SetupAnswers>): Promise<SavedSetup> {
  const write = setupWrite.then(async () => {
    const saved: SavedSetup = {
      ...(setup.get() ?? { ...DEFAULT_ANSWERS, id: currentUserId() }),
      ...patch,
    };
    await setup.set(saved);
    return saved;
  });
  setupWrite = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

/** Keeps the finished setup. The voice of the draft is in the speech settings. */
export async function saveSetup({ voiceService: _voiceService, ...answers }: OnboardingDraft): Promise<void> {
  await setup.set({ ...answers, id: currentUserId() });
}
