import { DEFAULT_ACCESS, type AccessProfile } from "./access.ts";
import { SERVICE_NAMES } from "./services.ts";
import {
  modelSettingsFrom,
  withProvider,
  type ModelSettings,
  type WritingModelConfig,
} from "./model-config.ts";
import {
  DEFAULT_SPEECH,
  speechServices,
  type SpeechService,
  type SpeechServiceChoice,
  type SpeechSettings,
} from "./voice.ts";

export const SETUP_MODES = ["free", "advanced"] as const;

export type SetupMode = (typeof SETUP_MODES)[number];

/** The service that suggests words while the user types. */
export type WritingService = WritingModelConfig["service"];

/** The voices that setup offers. The Dialogue voice is on the Voice screen. */
export type SetupVoice = Exclude<SpeechService, "dialogue">;

/** The setup answers that the app keeps. */
export interface SetupAnswers extends ModelSettings {
  autoSuggestions: boolean;
  autoPhrases: boolean;
  agentEnabled: boolean;
  name: string;
  speakingStyle: string;
  personalWords: string;
  mode: SetupMode | null;
  /** How the person chooses things, and how large the screen must be. */
  access: AccessProfile;
}

/** The answers of the setup steps. The voice goes to the speech settings, not to the setup. */
export interface OnboardingDraft extends SetupAnswers {
  voiceService: SetupVoice;
}

/** The finished setup, with the identifier of the owner beside its answers. */
export type SavedSetup = SetupAnswers & { id: string };

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

// The writing service moves to "apple" once the platform reports that it is ready.
export const DEFAULT_ANSWERS: SetupAnswers = {
  name: "",
  speakingStyle: SPEAKING_STYLES[0].value,
  personalWords: "",
  mode: "free",
  defaultModel: { service: "none", model: "" },
  suggestionsModel: null,
  autoSuggestions: true,
  autoPhrases: true,
  agentEnabled: true,
  access: DEFAULT_ACCESS,
};

/** The system voice needs no account. */
export const DEFAULT_DRAFT: OnboardingDraft = { ...DEFAULT_ANSWERS, voiceService: "system" };

/**
 * A saved setup in the current shape. A setup saved before a switch existed
 * has the switch on, and one saved with a single flat model gets the model
 * settings.
 */
export function savedSetupFrom(saved: SavedSetup | null): SavedSetup | null {
  if (!saved) return null;
  const { voiceService: _voiceService, ...answers } = saved as SavedSetup & { voiceService?: unknown };
  return {
    ...answers,
    ...modelSettingsFrom(answers),
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

/** The voices that setup offers. `systemVoice` describes the voice of this platform. */
export const setupVoices = (systemVoice: string) =>
  speechServices(systemVoice).filter(
    (choice): choice is SpeechServiceChoice & { value: SetupVoice } => choice.value !== "dialogue",
  );

/**
 * The speech settings of a setup saved before setup wrote them, or null.
 * That setup names its voice service.
 */
export function speechFromOlderSetup(setup: unknown): SpeechSettings | null {
  const service = (setup as { voiceService?: unknown } | null)?.voiceService;
  return service === "elevenlabs" ? { ...DEFAULT_SPEECH, provider: "elevenlabs" } : null;
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
