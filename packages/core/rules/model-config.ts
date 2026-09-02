/** A writing provider and the model selected for it. */
export interface WritingModelConfig {
  service: "apple" | "openrouter" | "none";
  /** Empty asks the provider to choose automatically. */
  model: string;
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
  feature: string,
): WritingModelConfig {
  return feature === "suggestions" && settings.suggestionsModel
    ? settings.suggestionsModel
    : settings.defaultModel;
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
