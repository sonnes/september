import { currentSetup, providerKey } from "@/services/os";
import { recordAiUsage, type GenerationFeature } from "@/services/usage";
import {
  buildSpaceContextPrompt,
  spaceDescriptionFrom,
  type SpaceDescription,
} from "@/rules/prompts";

/**
 * The writing service.
 *
 * The browser calls OpenRouter directly with the key from IndexedDB. Apple
 * Intelligence remains visible as a desktop-only service.
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

  if (service === "apple") throw new Error("Apple Intelligence is available in the macOS app.");
  const started = Date.now();
  const inputLength = request.messages.reduce(
    (total, message) => total + message.content.length,
    0,
  );
  const chosen = currentSetup()?.writingModel?.trim() ?? "";
  let answer: GenerateAnswer;
  try {
    const key = providerKey("openrouter");
    if (!key) throw new Error("Connect OpenRouter in Settings first.");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(chosen ? { ...request, model: chosen } : request),
    });
    if (!response.ok)
      throw new Error(`OpenRouter did not answer. Try again in a minute. (${response.status})`);
    const raw = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        cost?: number;
      };
    };
    answer = {
      text: raw.choices?.[0]?.message?.content ?? "",
      model: raw.model,
      cost_usd: raw.usage?.cost,
      usage: {
        prompt_tokens: raw.usage?.prompt_tokens ?? 0,
        completion_tokens: raw.usage?.completion_tokens ?? 0,
        total_tokens: raw.usage?.total_tokens ?? 0,
      },
    };
  } catch (reason) {
    void recordAiUsage({
      generation_type: options.feature,
      provider: "openrouter",
      model: "unknown",
      input_length: inputLength,
      output_length: 0,
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: Date.now() - started,
      success: false,
      cached: false,
      cost_source: "unknown",
      error_message: reason instanceof Error ? reason.message : String(reason),
    });
    throw reason;
  }

  const model = answer.model ?? "unknown";
  const free = model.endsWith(":free");
  void recordAiUsage({
    generation_type: options.feature,
    provider: "openrouter",
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
