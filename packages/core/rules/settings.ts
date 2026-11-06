/**
 * The keys of the settings that both apps store.
 *
 * A backup carries the portable settings, and a restore replaces them. The
 * device settings stay on the device that wrote them.
 */

export const PORTABLE_SETTINGS = {
  setup: "setup",
  speech: "speech",
  dismissedIdeas: "dismissed-ideas",
  spaceModes: "space-modes",
  panel: "panel-open",
  present: "present",
} as const;

export const DEVICE_SETTINGS = {
  lastPath: "lastPath",
  heardVoices: "heard-voices",
  audioOutput: "audio-output",
  providerKeys: "provider-keys",
  legacyMigration: "legacy-migration",
} as const;

export const SETTINGS = { ...PORTABLE_SETTINGS, ...DEVICE_SETTINGS } as const;

export type PortableSettingKey =
  (typeof PORTABLE_SETTINGS)[keyof typeof PORTABLE_SETTINGS];

export const PORTABLE_SETTING_KEYS: readonly PortableSettingKey[] =
  Object.values(PORTABLE_SETTINGS);

/** The owner of the rows when the system knows no login name. */
export const LOCAL_USER = "local-user";

/** The unsent words of Talk in one space. Device only. */
export const talkDraftKey = (spaceId: string) => `talk-draft:${spaceId}`;

/** The mood of Talk in one space. Device only. */
export const talkMoodKey = (spaceId: string) => `talk-mood:${spaceId}`;
