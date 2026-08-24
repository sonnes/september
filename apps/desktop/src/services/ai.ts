import { invoke } from "@tauri-apps/api/core";

import { currentSetup } from "@/services/os";
import { recordAiUsage, type GenerationFeature } from "@/services/usage";
import {
  buildSpaceContextPrompt,
  spaceDescriptionFrom,
  type SpaceDescription,
} from "@/rules/prompts";

/**
 * The writing service.
 *
 * Two commands answer in one shape: `apfel_generate` runs the model on this
 * Mac, and `openrouter_generate` calls the cloud. Both keep their key and
 * their network in Rust.
 */
export interface GenerateMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: GenerateMessage[];
  /** The OpenRouter model. Absent asks the free list of the app. */
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?:
    | { type: "json_object" }
    | { type: "json_schema"; name: string; schema: object };
}

interface GenerateAnswer {
  text: string;
  model?: string;
  cost_usd?: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** The service the user chose in setup, or nothing. */
export function writingService(): "apple" | "openrouter" | null {
  const chosen = currentSetup()?.writingService;
  return chosen === "apple" || chosen === "openrouter" ? chosen : null;
}

export const hasWritingService = () => writingService() !== null;

/**
 * What the writing service knows about the user, from setup.
 *
 * Setup collects the speaking style and the personal words, and Writing help
 * keeps them current. Empty when the user wrote neither.
 */
export function userContext(): string {
  const setup = currentSetup();
  return [setup?.speakingStyle, setup?.personalWords]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Text from the chosen service.
 *
 * A user with no writing service still sees the phrases, the starters, the
 * codes, and the rows from past messages. Only the last rows of the stripe
 * need this.
 */
export async function generate(
  request: GenerateRequest,
  options: { feature: GenerationFeature; signal?: AbortSignal },
): Promise<string> {
  const service = writingService();
  if (!service) throw new Error("Writing help is not set up.");

  const command =
    service === "apple" ? "apfel_generate" : "openrouter_generate";
  const started = Date.now();
  const inputLength = request.messages.reduce(
    (total, message) => total + message.content.length,
    0,
  );
  // The model the user chose in Settings. Apple Intelligence has one model
  // on this Mac, so only OpenRouter reads the answer.
  const chosen =
    service === "openrouter" ? currentSetup()?.writingModel?.trim() : "";
  let answer: GenerateAnswer;
  try {
    answer = await invoke<GenerateAnswer>(command, {
      request: chosen ? { ...request, model: chosen } : request,
    });
  } catch (reason) {
    void recordAiUsage({
      generation_type: options.feature,
      provider: service,
      model: service === "apple" ? "apple-foundationmodel" : "unknown",
      input_length: inputLength,
      output_length: 0,
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: Date.now() - started,
      success: false,
      cached: false,
      cost_source: service === "apple" ? "free" : "unknown",
      error_message: reason instanceof Error ? reason.message : String(reason),
    });
    throw reason;
  }

  const model =
    answer.model ?? (service === "apple" ? "apple-foundationmodel" : "unknown");
  const free = service === "apple" || model.endsWith(":free");
  void recordAiUsage({
    generation_type: options.feature,
    provider: service,
    model,
    input_length: inputLength,
    output_length: answer.text.length,
    input_tokens: answer.usage.prompt_tokens,
    output_tokens: answer.usage.completion_tokens,
    latency_ms: Date.now() - started,
    success: true,
    cached: false,
    cost_usd: free ? 0 : answer.cost_usd,
    cost_source: free
      ? "free"
      : answer.cost_usd === undefined
        ? "unknown"
        : "measured",
  });
  // The command cannot be stopped once it starts, so a caller that gave up
  // throws instead of using an answer it no longer wants.
  if (options.signal?.aborted) throw new Error("The request was stopped.");

  return answer.text;
}

/** The strings of a `{"items": [...]}` reply, and nothing when it is not one. */
export function itemsFrom(text: string, key: string): string[] {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const value = parsed[key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * The name and the note of a space, from its first message.
 *
 * The note reaches the model that writes the stripe and the phrases, so a
 * space that has one gives better words than a space that has none. A user
 * with no writing service keeps the made-up title, and nothing else changes.
 */
export async function describeSpace(
  messageText: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<SpaceDescription | null> {
  if (!hasWritingService()) return null;

  const { system, user } = buildSpaceContextPrompt(messageText);
  const answer = await generate(
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    },
    { feature: "context", signal },
  );

  return spaceDescriptionFrom(answer);
}
