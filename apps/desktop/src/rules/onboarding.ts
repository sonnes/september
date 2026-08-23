export type SetupMode = "free" | "advanced";

/** The service that suggests words while the user types. */
export type WritingService = "apple" | "openrouter" | "none";

/** The service that speaks a message out loud. */
export type VoiceService = "system" | "elevenlabs";

export interface OnboardingDraft {
  name: string;
  speakingStyle: string;
  personalWords: string;
  mode: SetupMode | null;
  writingService: WritingService;
  /**
   * The OpenRouter model the user chose. Empty means the free list of the
   * app, where the first model that answers writes the suggestion.
   */
  writingModel: string;
  voiceService: VoiceService;
}

export const SPEAKING_STYLES = [
  {
    label: "Plain",
    description: "Clear and short",
    value: "Plain, warm, and direct. Use everyday language.",
  },
  {
    label: "Warm",
    description: "Friendly and gentle",
    value: "Warm, friendly, and reassuring. Keep messages clear and kind.",
  },
  {
    label: "Detailed",
    description: "A little more context",
    value:
      "Clear and thoughtful. Add a little context when it helps people understand.",
  },
] as const;

// The defaults always work: the system voice needs no account, and the
// writing service moves to "apple" once the backend reports it is ready.
export const DEFAULT_DRAFT: OnboardingDraft = {
  name: "",
  speakingStyle: SPEAKING_STYLES[0].value,
  personalWords: "",
  mode: null,
  writingService: "none",
  writingModel: "",
  voiceService: "system",
};

// Free mode is the private mode on this platform: Apple Intelligence runs on
// the Mac. ponytail: the copy names the macOS requirement instead of reading
// `apfel_status` here, which would make the step wait on a sidecar start.
export const SETUP_MODES = [
  {
    id: "free",
    accent: "amber",
    badge: "Free start",
    title: "Free AI mode",
    body: "Free writing help that runs on this Mac.",
    bullets: [
      "Apple Intelligence writes the suggestions. Your words do not leave the device.",
      "Spaces and saved phrases stay on this device.",
      "It needs macOS 26 on Apple silicon.",
    ],
  },
  {
    id: "advanced",
    accent: "sky",
    badge: "Advanced",
    title: "Use your own services",
    body: "For people or caregivers who already have voice or AI accounts.",
    bullets: [
      "Add your own OpenRouter or ElevenLabs access key.",
      "Choose the voice or writing helper you prefer.",
      "September contacts only the services you choose.",
    ],
  },
] as const satisfies readonly {
  id: SetupMode;
  accent: "amber" | "sky";
  badge: string;
  title: string;
  body: string;
  bullets: readonly string[];
}[];

export const WRITING_SERVICES = [
  {
    value: "apple",
    label: "Apple Intelligence",
    description: "Runs on this Mac. Your words do not leave the device.",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    description: "Cloud service. Stronger models. Free models are available.",
  },
  {
    value: "none",
    label: "No writing help",
    description: "September stays a keyboard and a voice.",
  },
] as const satisfies readonly {
  value: WritingService;
  label: string;
  description: string;
}[];

export const VOICE_SERVICES = [
  {
    value: "system",
    label: "System voice",
    description: "Built into macOS. Free, and it works without a network.",
  },
  {
    value: "elevenlabs",
    label: "ElevenLabs",
    description: "Cloud service. Natural voices, and you can clone a voice.",
  },
] as const satisfies readonly {
  value: VoiceService;
  label: string;
  description: string;
}[];

export const STEPS = [
  {
    path: "/welcome",
    label: "Welcome",
    title: "Faster communication, fewer keystrokes.",
    subtitle:
      "September helps you type and speak naturally. Start with simple defaults, then add more when you are ready.",
    helper: "Get started in minutes.",
    action: "Get started",
  },
  {
    path: "/profile",
    label: "About you",
    title: "Tell us about yourself.",
    subtitle:
      "Keep this short. A caregiver can fill it in now and improve it later.",
    helper: "Only the name is required.",
    action: "Save and continue",
  },
  {
    path: "/mode",
    label: "Choose setup",
    title: "How should September run?",
    subtitle: "Pick what fits. You can change any of this later in Settings.",
    helper: "You can switch modes anytime in Settings.",
    action: "Continue",
  },
  {
    path: "/connect",
    label: "Connect",
    title: "Choose what helps you.",
    subtitle:
      "Both answers are ready. Change one only if you want a different service.",
    helper: "You can change every service later, in Settings.",
    action: "Continue",
  },
  {
    path: "/finish",
    label: "Finish",
    title: "You're all set.",
    subtitle: "Review your choices before you start communicating.",
    helper: "You can change this anytime in Settings.",
    action: "Start communicating",
  },
] as const;

export type StepPath = (typeof STEPS)[number]["path"];

export const WELCOME_POINTS = [
  {
    title: "Simple defaults",
    description: "Start without a long configuration process.",
  },
  {
    title: "Short taps",
    description: "Suggestion buttons help reduce typing.",
  },
  {
    title: "Natural speech",
    description: "Choose a voice that feels like you.",
  },
  {
    title: "Full expression",
    description: "Common needs, feelings, and social phrases stay easy to reach.",
  },
] as const;

/** The steps this draft walks through. Free setup owns no key, so it skips
 * the connect step in the sidebar and in both navigation directions. */
export function stepsFor(
  draft: Pick<OnboardingDraft, "mode">,
): readonly (typeof STEPS)[number][] {
  if (draft.mode === "advanced") return STEPS;
  return STEPS.filter((step) => step.path !== "/connect");
}

export function stepFor(path: StepPath): (typeof STEPS)[number] {
  return STEPS.find((step) => step.path === path)!;
}

export function stepIndex(
  path: string,
  draft: Pick<OnboardingDraft, "mode">,
): number {
  return stepsFor(draft).findIndex((step) => step.path === path);
}

export function nextStep(
  path: StepPath,
  draft: Pick<OnboardingDraft, "mode">,
): StepPath | null {
  const steps = stepsFor(draft);
  return steps[stepIndex(path, draft) + 1]?.path ?? null;
}

export function previousStep(
  path: StepPath,
  draft: Pick<OnboardingDraft, "mode">,
): StepPath | null {
  const steps = stepsFor(draft);
  const index = stepIndex(path, draft);
  return index > 0 ? steps[index - 1].path : null;
}

/**
 * Setup is done when it holds the two answers every screen needs: a name and
 * a mode. The launch route and the app guard both read this, so a finished
 * setup never shows again.
 */
export function isSetupDone(
  setup: Pick<OnboardingDraft, "name" | "mode"> | null,
): boolean {
  return Boolean(setup && setup.name.trim() && setup.mode);
}

// A step is reachable when the answers it depends on exist. The progress nav
// and the reload guard both read this, so no "furthest step" state is kept.
export function canReach(
  path: StepPath,
  draft: Pick<OnboardingDraft, "name" | "mode">,
): boolean {
  if (path === "/welcome" || path === "/profile") return true;
  if (!draft.name.trim()) return false;
  if (path === "/mode") return true;
  if (path === "/connect") return draft.mode === "advanced";
  return draft.mode !== null;
}
