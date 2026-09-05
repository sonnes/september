import type {
  ModelSettings,
  WritingModelConfig,
} from "@september/core/rules/model-config";

export type SetupMode = "free" | "advanced";

/** The service that suggests words while the user types. */
export type WritingService = WritingModelConfig["service"];

/** The service that speaks a message out loud. */
export type VoiceService = "system" | "elevenlabs";

export interface OnboardingDraft extends ModelSettings {
  name: string;
  speakingStyle: string;
  personalWords: string;
  mode: SetupMode | null;
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
  mode: "free",
  defaultModel: { service: "none", model: "" },
  suggestionsModel: null,
  voiceService: "system",
};

export const WRITING_SERVICES = [
  {
    value: "apple",
    label: "Apple Intelligence",
    description: "Runs on this Mac. Your words do not leave the device.",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    description:
      "Cloud service. Stronger writing help. Free models are available.",
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
      "September helps you speak naturally with fewer keystrokes. Start simple now, and customize anytime.",
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
    title: "You’re all set.",
    subtitle: "Review your choices before you start communicating.",
    helper: "You can change this anytime in Settings.",
    action: "Start communicating",
  },
] as const;

export type StepPath = (typeof STEPS)[number]["path"];

export const WELCOME_POINTS = [
  {
    title: "Simple defaults",
    description: "Start without a long setup.",
  },
  {
    title: "Short taps",
    description: "Suggestion buttons help reduce typing.",
  },
  {
    title: "A natural voice",
    description: "Choose a voice that feels like you.",
  },
  {
    title: "Full expression",
    description:
      "Common needs, feelings, and social phrases stay easy to reach.",
  },
] as const;

/** Every setup follows the same steps; saved mode values remain compatible. */
export function stepsFor(_draft: Pick<OnboardingDraft, "mode">): readonly (typeof STEPS)[number][] {
  return STEPS;
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
  return true;
}
