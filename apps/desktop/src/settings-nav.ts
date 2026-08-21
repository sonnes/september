/**
 * The settings sections, in plain TypeScript so a test can read them without
 * a renderer. `settings.tsx` supplies the icon and the screens.
 *
 * The web app has five sections. Two of them have a desktop equivalent.
 * Listening needs a transcription backend, Usage needs a spend count, and
 * Account needs an account. Voice already has its own screen, `/voice`.
 */

import type { Connections } from "./os";
import type { OnboardingDraft, SetupMode } from "./onboarding";

export const SETTINGS_NAV = [
  {
    path: "/settings",
    title: "Setup",
    description: "How September runs, and its connections.",
  },
  {
    path: "/settings/writing",
    title: "Writing help",
    description: "The service that writes, and what it knows about you.",
  },
] as const satisfies readonly {
  path: string;
  title: string;
  description: string;
}[];

export type SettingsPath = (typeof SETTINGS_NAV)[number]["path"];

/** The open section. A key page is a child of Setup, so Setup stays open. */
export function sectionFor(pathname: string): (typeof SETTINGS_NAV)[number] {
  return (
    SETTINGS_NAV.find(
      (item) => item.path !== "/settings" && pathname.startsWith(item.path),
    ) ?? SETTINGS_NAV[0]
  );
}

/**
 * The setup answers a mode change implies.
 *
 * Free mode runs on this Mac, so it takes the local writer and the local
 * voice. Advanced keeps every answer, so a switch back loses nothing. Neither
 * one erases a key: a key lives in the Keychain, and a mode is not a reason
 * to forget it.
 */
export function modeUpdate(
  mode: SetupMode,
  connections: { apple: Pick<Connections["apple"], "available"> },
  current: Pick<OnboardingDraft, "writingService" | "voiceService">,
): Pick<OnboardingDraft, "mode" | "writingService" | "voiceService"> {
  if (mode === "advanced") return { mode, ...current };

  return {
    mode,
    writingService: connections.apple.available ? "apple" : "none",
    voiceService: "system",
  };
}

/** How to get a key, in the words of the user. The addresses match the web app. */
export const CONNECTION_GUIDES = {
  openrouter: {
    name: "OpenRouter",
    lede: "One connection that gives writing help. Free models are available, and no card is necessary.",
    steps: [
      "Open the OpenRouter keys page and sign in.",
      'Press "Create key" and copy it.',
      "Paste the key below.",
    ],
    url: "https://openrouter.ai/keys",
  },
  elevenlabs: {
    name: "ElevenLabs",
    lede: "Natural voices, and a clone of your own voice. In September it speaks your messages.",
    steps: [
      "Open the ElevenLabs keys page and sign in.",
      'Press "Create API key" and copy it.',
      "Paste the key below.",
    ],
    url: "https://elevenlabs.io/app/settings/keys",
  },
} as const satisfies Record<
  string,
  { name: string; lede: string; steps: readonly string[]; url: string }
>;

export type ConnectionId = keyof typeof CONNECTION_GUIDES;

export const isConnectionId = (value: string): value is ConnectionId =>
  value in CONNECTION_GUIDES;
