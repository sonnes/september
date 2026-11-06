/**
 * The settings that both apps keep, held in memory after one read.
 *
 * `loadSettings` reads them once, before the first screen. A screen then
 * reads a value at once, and a change goes to the store first and to the
 * memory after the write succeeds.
 */

import { useSyncExternalStore } from "react";

import { platform } from "@platform/adapter";
import { moodFrom, type MoodKey } from "@september/core/rules/moods";
import {
  DEFAULT_DRAFT,
  savedSetupFrom,
  type OnboardingDraft,
  type SavedSetup,
} from "@september/core/rules/onboarding";
import { panelStateFrom, type PanelState } from "@september/core/rules/panel";
import { presentSettings, type PresentSettings } from "@september/core/rules/present/settings";
import { SETTINGS, talkDraftKey, talkMoodKey } from "@september/core/rules/settings";
import type { SpaceModes } from "@september/core/rules/spaces";

import type { SpeechSettings } from "./speech";

/** The owner of the rows when the system knows no login name. */
export const LOCAL_USER = "local-user";

export interface Setting<T> {
  get(): T;
  set(value: T): Promise<void>;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
}

/** One setting, read once and held. */
export function setting<T>(key: string, from: (saved: unknown) => T): Setting<T> {
  let value = from(null);
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    async set(next) {
      await platform.store.putSetting(key, next);
      value = next;
      for (const listener of listeners) listener();
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
/** The mode each space was left in, by slug. */
export const spaceModes = setting<SpaceModes>(SETTINGS.spaceModes, recordOf);
/** The voices heard lately on the Voice screen, newest first. */
export const heardVoices = setting<string[]>(SETTINGS.heardVoices, listOf);
/** The voice the user chose, or null before the first choice. */
export const savedSpeech = setting<SpeechSettings | null>(
  SETTINGS.speech,
  (saved) => (saved as SpeechSettings | null) ?? null,
);

const loaded: Setting<unknown>[] = [
  setup,
  panel,
  present,
  dismissedIdeas,
  spaceModes,
  heardVoices,
  savedSpeech,
];

let identity = { name: "", userId: LOCAL_USER };

/** Reads every held setting. The bootstrap awaits this once before it renders. */
export async function loadSettings(): Promise<void> {
  const [found] = await Promise.all([
    platform.device.identity(),
    ...loaded.map((held) => held.load()),
  ]);
  identity = { name: found.name, userId: found.userId ?? LOCAL_USER };
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
export function updateSetup(patch: Partial<OnboardingDraft>): Promise<SavedSetup> {
  const write = setupWrite.then(async () => {
    const saved: SavedSetup = {
      ...(setup.get() ?? { ...DEFAULT_DRAFT, id: currentUserId() }),
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

/** Keeps the finished setup. */
export async function saveSetup(draft: OnboardingDraft): Promise<void> {
  await setup.set({ ...draft, id: currentUserId() });
}

/** Unsent words are device settings, apart from the spoken transcript. */
export async function readTalkDraft(spaceId: string): Promise<string> {
  return (await platform.store.getSetting<string>(talkDraftKey(spaceId))) ?? "";
}

export const saveTalkDraft = (spaceId: string, words: string): Promise<void> =>
  platform.store.putSetting(talkDraftKey(spaceId), words);

/** The mood of a Talk space. It stays until the user presses its key again. */
export async function readTalkMood(spaceId: string): Promise<MoodKey | null> {
  return moodFrom(await platform.store.getSetting(talkMoodKey(spaceId)));
}

export const saveTalkMood = (spaceId: string, mood: MoodKey | null): Promise<void> =>
  platform.store.putSetting(talkMoodKey(spaceId), mood);
