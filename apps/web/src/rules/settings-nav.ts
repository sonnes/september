/**
 * The settings sections, in plain TypeScript so a test can read them without
 * a renderer. `settings.tsx` supplies the icon and the screens.
 *
 * The web app has five sections. Three of them have a desktop equivalent.
 * Listening needs a transcription backend, and Account needs an account.
 * Voice already has its own screen, `/voice`.
 */

export const SETTINGS_NAV = [
  {
    path: "/settings",
    title: "Services",
    description: "The services September uses, and their keys.",
  },
  {
    path: "/settings/writing",
    title: "Writing help",
    description: "The service that writes, and what it knows about you.",
  },
  {
    path: "/settings/usage",
    title: "Usage",
    description: "Typing saved and service use in this browser.",
  },
] as const satisfies readonly {
  path: string;
  title: string;
  description: string;
}[];

export type SettingsPath = (typeof SETTINGS_NAV)[number]["path"];

/** The open section. A key page is a child of Services, so Services stays open. */
export function sectionFor(pathname: string): (typeof SETTINGS_NAV)[number] {
  return (
    SETTINGS_NAV.find(
      (item) => item.path !== "/settings" && pathname.startsWith(item.path),
    ) ?? SETTINGS_NAV[0]
  );
}

/** How to get a key, in the words of the user. The addresses match the web app. */
export const CONNECTION_GUIDES = {
  openrouter: {
    name: "OpenRouter",
    lede: "One service that gives writing help. Free models are available, and no card is necessary.",
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
