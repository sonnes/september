/** The jobs that ask a writing model for text. */
export type GenerationFeature = "suggestions" | "phrases" | "agent";

/** A writing provider and the model selected for it. */
export interface WritingModelConfig {
  service: "apple" | "openrouter" | "none";
  /** Empty is Automatic. */
  model: string;
}

/** The address of the OpenRouter API. */
export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** The OpenRouter router that picks a free model. An automatic Agent asks it. */
export const AUTOMATIC_MODEL = "openrouter/free";

/**
 * The free models that automatic suggestions and phrases ask, best first.
 * OpenRouter takes the whole list and uses the first model that answers, so
 * one bad day for one model is not one bad day for the user. Refresh the ids
 * when they rotate.
 */
export const FREE_MODELS = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-20b:free",
] as const;

/** True when the user chose Automatic for an OpenRouter job. */
export function isAutomatic(config: WritingModelConfig): boolean {
  return config.service === "openrouter" && !config.model.trim();
}

/** The one model of Apple Intelligence. */
export const APPLE_MODEL = "apple-foundationmodel";

/** The model id that a request names for a configuration. */
export function modelIdFor(config: WritingModelConfig): string {
  if (config.service === "apple") return APPLE_MODEL;
  return config.model.trim() || AUTOMATIC_MODEL;
}

/** The model settings shared by setup and every text-generation call. */
export interface ModelSettings {
  defaultModel: WritingModelConfig;
  /** Null makes Suggestions use `defaultModel`. */
  suggestionsModel: WritingModelConfig | null;
}

/** Returns the only feature override, or the application-wide default. */
export function modelConfigFor(
  settings: ModelSettings,
  feature: GenerationFeature,
): WritingModelConfig {
  return feature === "suggestions" && settings.suggestionsModel
    ? settings.suggestionsModel
    : settings.defaultModel;
}

/**
 * The model settings after a change of provider. Every feature moves with it,
 * so no feature points at a provider the user left.
 */
export function withProvider(
  settings: ModelSettings,
  service: WritingModelConfig["service"],
): ModelSettings {
  return {
    defaultModel: { ...settings.defaultModel, service },
    suggestionsModel: settings.suggestionsModel && { ...settings.suggestionsModel, service },
  };
}

/**
 * The model settings of a saved setup, whatever shape it was written in.
 *
 * Setup used to hold one flat service and model. A row written then has no
 * `defaultModel`, and every screen that reads one would throw on it.
 */
export function modelSettingsFrom(saved: unknown): ModelSettings {
  const row = (saved ?? {}) as Record<string, unknown>;

  const config = (value: unknown): WritingModelConfig | null => {
    const one = value as Partial<WritingModelConfig> | null | undefined;
    return one?.service
      ? { service: one.service, model: one.model ?? "" }
      : null;
  };

  const flat = (): WritingModelConfig =>
    typeof row.writingService === "string"
      ? {
          service: row.writingService as WritingModelConfig["service"],
          model: typeof row.writingModel === "string" ? row.writingModel : "",
        }
      : { service: "none", model: "" };

  return {
    defaultModel: config(row.defaultModel) ?? flat(),
    suggestionsModel: config(row.suggestionsModel),
  };
}

/** One model that September offers by name. */
export interface CuratedModel {
  /** The OpenRouter model id. */
  id: string;
  name: string;
  group: "Frontier" | "Open models";
  free: boolean;
}

/**
 * Quick models for suggestions, which run after each space or punctuation.
 *
 * The ids come from the OpenRouter models API on 2026-09-25. Every model on
 * both lists accepts tool calls. Review the lists in each release.
 */
export const SUGGESTIONS_MODELS: readonly CuratedModel[] = [
  { id: "openai/gpt-6-luna", name: "GPT-6 Luna", group: "Frontier", free: false },
  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", group: "Frontier", free: false },
  { id: "google/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", group: "Frontier", free: false },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", group: "Frontier", free: false },
  { id: "openai/gpt-oss-20b", name: "gpt-oss-20b", group: "Open models", free: false },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", group: "Open models", free: false },
  { id: "qwen/qwen3.8-27b:free", name: "Qwen3.8 27B", group: "Open models", free: true },
];

/** Stronger models for the agent, phrases, and a new space description. */
export const AGENT_MODELS: readonly CuratedModel[] = [
  { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", group: "Frontier", free: false },
  { id: "openai/gpt-6-sol", name: "GPT-6 Sol", group: "Frontier", free: false },
  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", group: "Frontier", free: false },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", group: "Frontier", free: false },
  { id: "moonshotai/kimi-k3", name: "Kimi K3", group: "Open models", free: false },
  { id: "z-ai/glm-5.3", name: "GLM 5.3", group: "Open models", free: false },
  { id: "openai/gpt-oss-120b", name: "gpt-oss-120b", group: "Open models", free: false },
];

/** One row of a model list. An empty id asks for Automatic. */
export interface ModelChoice {
  id: string;
  name: string;
  note?: string;
  group?: string;
}

/**
 * The rows of one model list: Automatic, then the curated models.
 *
 * A saved model that is not on the list stays visible as the first row, so a
 * user who chose it before the list existed can see what is in use.
 */
export function modelChoices(
  list: readonly CuratedModel[],
  saved: string,
): ModelChoice[] {
  const rows: ModelChoice[] = [
    { id: "", name: "Automatic", note: "Free" },
    ...list.map(({ id, name, group, free }) => ({
      id,
      name,
      group,
      note: free ? "Free" : "Paid",
    })),
  ];
  return saved && !list.some((model) => model.id === saved)
    ? [{ id: saved, name: `Current: ${saved}` }, ...rows]
    : rows;
}
