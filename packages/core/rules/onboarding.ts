import { DEFAULT_ACCESS, type AccessProfile } from "./access.ts";
import { SERVICE_NAMES } from "./services.ts";
import {
  modelSettingsFrom,
  withProvider,
  type ModelSettings,
  type WritingModelConfig,
} from "./model-config.ts";

export type SetupMode = "free" | "advanced";

/** The service that suggests words while the user types. */
export type WritingService = WritingModelConfig["service"];

/** The service that speaks a message out loud. */
export type VoiceService = "system" | "elevenlabs";

export interface OnboardingDraft extends ModelSettings {
  autoSuggestions: boolean;
  autoPhrases: boolean;
  agentEnabled: boolean;
  name: string;
  speakingStyle: string;
  personalWords: string;
  mode: SetupMode | null;
  voiceService: VoiceService;
  /** How the person chooses things, and how large the screen must be. */
  access: AccessProfile;
}

/** The finished setup, with the identifier of the owner beside its answers. */
export type SavedSetup = OnboardingDraft & { id: string };

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

// The system voice needs no account, and the writing service moves to
// "apple" once the platform reports that it is ready.
export const DEFAULT_DRAFT: OnboardingDraft = {
  name: "",
  speakingStyle: SPEAKING_STYLES[0].value,
  personalWords: "",
  mode: "free",
  defaultModel: { service: "none", model: "" },
  suggestionsModel: null,
  autoSuggestions: true,
  autoPhrases: true,
  agentEnabled: true,
  voiceService: "system",
  access: DEFAULT_ACCESS,
};

/**
 * A saved setup in the current shape. A setup saved before a switch existed
 * has the switch on, and one saved with a single flat model gets the model
 * settings.
 */
export function savedSetupFrom(saved: SavedSetup | null): SavedSetup | null {
  if (!saved) return null;
  return {
    ...saved,
    ...modelSettingsFrom(saved),
    autoSuggestions: saved.autoSuggestions ?? true,
    autoPhrases: saved.autoPhrases ?? true,
    agentEnabled: saved.agentEnabled ?? true,
  };
}

export const WRITING_SERVICES = [
  {
    value: "apple",
    label: SERVICE_NAMES.apple,
    description: "Runs on this Mac. Your words do not leave the device.",
  },
  {
    value: "openrouter",
    label: SERVICE_NAMES.openrouter,
    description:
      "Cloud service. Stronger AI Assistance. Free models are available.",
  },
  {
    value: "none",
    label: SERVICE_NAMES.none,
    description: "September stays a keyboard and a voice.",
  },
] as const satisfies readonly {
  value: WritingService;
  label: string;
  description: string;
}[];

/** The voice services. `systemVoice` describes the voice of this platform. */
export function voiceServices(systemVoice: string): readonly {
  value: VoiceService;
  label: string;
  description: string;
}[] {
  return [
    { value: "system", label: SERVICE_NAMES.system, description: systemVoice },
    {
      value: "elevenlabs",
      label: SERVICE_NAMES.elevenlabs,
      description: "Cloud service. Natural voices, and you can clone a voice.",
    },
  ];
}

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
    path: "/choose",
    label: "How you choose",
    title: "How do you choose things?",
    subtitle:
      "Pick the way you use September most. The screen sets its size and timing to match.",
    helper: "A caregiver can choose this now. You can change it later in Settings.",
    action: "Continue",
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

export type Step = (typeof STEPS)[number];
export type StepPath = Step["path"];

export function stepFor(path: StepPath): Step {
  return STEPS.find((step) => step.path === path)!;
}

/** The place of a path among the steps, or -1 for a path that is not a step. */
export function stepIndex(path: string): number {
  return STEPS.findIndex((step) => step.path === path);
}

export function nextStep(path: StepPath): StepPath | null {
  return STEPS[stepIndex(path) + 1]?.path ?? null;
}

export function previousStep(path: StepPath): StepPath | null {
  const index = stepIndex(path);
  return index > 0 ? STEPS[index - 1].path : null;
}

/**
 * Setup is done when it holds the two answers every screen needs: a name and
 * a mode.
 */
export function isSetupDone(
  setup: Pick<OnboardingDraft, "name" | "mode"> | null,
): boolean {
  return Boolean(setup && setup.name.trim() && setup.mode);
}

/** A step after About you needs a name. */
export function canReach(
  path: StepPath,
  draft: Pick<OnboardingDraft, "name">,
): boolean {
  return stepIndex(path) <= stepIndex("/profile") || Boolean(draft.name.trim());
}

/** What the platform reports about the services that setup can choose. */
export interface ServiceReadiness {
  appleAvailable: boolean;
  openrouterConnected: boolean;
  elevenlabsConnected: boolean;
}

/**
 * The services that setup chooses by itself. A choice the person made stays.
 * Apple Intelligence wins when it is ready, then a connected OpenRouter. A
 * connected ElevenLabs speaks.
 */
export function defaultServices(
  draft: OnboardingDraft,
  ready: ServiceReadiness,
): OnboardingDraft {
  const service =
    draft.defaultModel.service !== "none"
      ? draft.defaultModel.service
      : ready.appleAvailable
        ? "apple"
        : ready.openrouterConnected
          ? "openrouter"
          : "none";
  return {
    ...draft,
    ...withProvider(draft, service),
    voiceService: ready.elevenlabsConnected ? "elevenlabs" : draft.voiceService,
  };
}
