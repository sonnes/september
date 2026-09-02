import type {
  AssistantMessage,
  Context,
  Model,
  Models,
} from "@earendil-works/pi-ai";

import {
  modelContextFrom,
  modelTextFrom,
  type AgentWriter,
  type ModelIdentity,
} from "@september/core/rules/agent";
import {
  modelConfigFor,
  type WritingModelConfig,
} from "@september/core/rules/model-config";
import type { CostSource } from "@september/core/rules/usage-summary";

import { call } from "@/services/data";
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
 * Apple Intelligence answers through `apfel_generate`, on this Mac. OpenRouter
 * answers through one typed client, which calls the loopback proxy that Rust
 * holds. Either way the key stays in Rust and the WebView never sees one.
 */
export interface GenerateMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: GenerateMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?:
    | { type: "json_object" }
    | { type: "json_schema"; name: string; schema: object };
}

/** The addresses of the proxy and the token of this run. It holds no key. */
interface WritingProxy {
  /** Where a cloud model answers. */
  baseUrl: string;
  /** Where the model on this Mac answers. */
  appleUrl: string;
  token: string;
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const FREE_AGENT_MODEL = "openrouter/free";
const APPLE_MODEL = "apple-foundationmodel";
const AGENT_MAX_TOKENS = 1_024;
const AGENT_TEMPERATURE = 0.2;

const IDENTITY: ModelIdentity<"openai-completions", "openrouter"> = {
  api: "openai-completions",
  provider: "openrouter",
  model: "",
};

/** What one call answered, whichever service answered it. */
interface Answered {
  text: string;
  model: string;
  priced: boolean;
  costUsd?: number;
  promptTokens: number;
  completionTokens: number;
}

/**
 * The client and the proxy, built once and kept.
 *
 * Neither exists until the first call that needs the cloud, so a Mac that only
 * uses Apple Intelligence starts no proxy and loads no client.
 */
let client: Promise<{ models: Models; proxy: WritingProxy }> | null = null;

function openRouter(): Promise<{ models: Models; proxy: WritingProxy }> {
  client ??= (async () => {
    const [{ createModels }, { openrouterProvider }, proxy] = await Promise.all([
      import("@earendil-works/pi-ai"),
      import("@earendil-works/pi-ai/providers/openrouter"),
      call<WritingProxy>("writing_proxy"),
    ]);
    const models = createModels();
    models.setProvider(openrouterProvider());
    return { models, proxy };
  })();
  return client;
}

/**
 * A model the catalog does not list.
 *
 * The user typed its name, so September asks for it. Nobody knows its price,
 * which is why a call to one records no cost rather than a wrong one.
 */
const unlistedModel = (id: string): Model<"openai-completions"> => ({
  id,
  name: id,
  api: "openai-completions",
  provider: "openrouter",
  baseUrl: OPENROUTER_BASE,
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128_000,
  maxTokens: 8_192,
});

interface ChosenModel {
  models: Models;
  model: Model<"openai-completions">;
  /** The catalog holds this model's rates, so a cost from it means something. */
  priced: boolean;
  key: string;
}

/**
 * One model, addressed at the proxy rather than at the service.
 *
 * The catalog gives the name and the rates. The address and the key are the
 * proxy's, so the request leaves the WebView carrying nothing worth stealing.
 * Apple Intelligence takes the same road: its sidecar answers a loopback
 * origin only, and the WebView is not one.
 */
async function modelFor(
  id: string,
  service: "apple" | "openrouter" = "openrouter",
): Promise<ChosenModel> {
  const { models, proxy } = await openRouter();
  const known =
    service === "apple"
      ? undefined
      : (models.getModel("openrouter", id) as
          | Model<"openai-completions">
          | undefined);
  const base = service === "apple" ? proxy.appleUrl : proxy.baseUrl;
  return {
    models,
    model: { ...(known ?? unlistedModel(id)), baseUrl: base },
    // Apple Intelligence runs on this Mac, so its rates are nothing at all.
    priced: known !== undefined,
    key: proxy.token,
  };
}

/**
 * What one call cost, and how well September knows it.
 *
 * Apple Intelligence runs on this Mac and costs nothing. A free model costs
 * nothing and says so. A priced model gives an estimate from its published
 * rates and the tokens it used. A model nobody prices gives a number nobody
 * should trust, so it gives none.
 */
function priceOf(
  service: "apple" | "openrouter",
  model: string,
  priced: boolean,
  costUsd: number | undefined,
): { cost_usd?: number; cost_source: CostSource } {
  if (service === "apple" || model.endsWith(":free")) {
    return { cost_usd: 0, cost_source: "free" };
  }
  if (priced && costUsd !== undefined) {
    return { cost_usd: costUsd, cost_source: "estimated" };
  }
  return { cost_source: "unknown" };
}

/**
 * The parts of a request the typed client has no option for.
 *
 * `response_format` carries the JSON mode that Suggestions and the space
 * description rely on. `parallel_tool_calls` holds the model to one call at a
 * time, which the agent loop requires. An empty model is removed, so the proxy
 * sends its free list and the first model that answers wins.
 */
function shapePayload(
  payload: unknown,
  request: {
    model: string;
    responseFormat?: GenerateRequest["response_format"];
    tools?: boolean;
  },
): unknown {
  const body = { ...(payload as Record<string, unknown>) };
  if (!request.model) delete body.model;
  if (request.responseFormat) body.response_format = request.responseFormat;
  if (request.tools) body.parallel_tool_calls = false;
  return body;
}

function configuredModel(feature: GenerationFeature): WritingModelConfig {
  const setup = currentSetup();
  return setup
    ? modelConfigFor(setup, feature)
    : { service: "none", model: "" };
}

/** The service configured for one feature, or nothing. */
export function writingService(
  feature: GenerationFeature = "agent",
): "apple" | "openrouter" | null {
  const chosen = configuredModel(feature).service;
  return chosen === "apple" || chosen === "openrouter" ? chosen : null;
}

export const hasWritingService = (feature: GenerationFeature = "agent") =>
  writingService(feature) !== null;

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

/** Text from Apple Intelligence, which runs on this Mac. */
async function appleText(request: GenerateRequest): Promise<Answered> {
  const answer = await call<{
    text: string;
    model?: string;
    cost_usd?: number;
    usage: { prompt_tokens: number; completion_tokens: number };
  }>("apfel_generate", request);
  return {
    text: answer.text,
    model: answer.model ?? APPLE_MODEL,
    priced: false,
    promptTokens: answer.usage.prompt_tokens,
    completionTokens: answer.usage.completion_tokens,
  };
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
  const config = configuredModel(options.feature);
  const service = writingService(options.feature);
  if (!service) throw new Error("Writing help is not set up.");

  const started = Date.now();
  const inputLength = request.messages.reduce(
    (total, message) => total + message.content.length,
    0,
  );
  // Apple Intelligence has one model on this Mac, so only OpenRouter reads
  // the model the user chose in Settings.
  const chosen = service === "openrouter" ? config.model.trim() : "";
  let answered: Answered;
  try {
    if (service === "apple") {
      answered = await appleText(request);
    } else {
      const { models, model, priced, key } = await modelFor(
        chosen || FREE_AGENT_MODEL,
      );
      const message = await models.complete(
        model,
        modelContextFrom(request.messages, { ...IDENTITY, model: model.id }),
        {
          apiKey: key,
          signal: options.signal,
          ...(request.temperature === undefined
            ? {}
            : { temperature: request.temperature }),
          ...(request.max_tokens === undefined
            ? {}
            : { maxTokens: request.max_tokens }),
          onPayload: (payload) =>
            shapePayload(payload, {
              model: chosen,
              responseFormat: request.response_format,
            }),
        },
      );
      answered = {
        text: modelTextFrom(message),
        model: message.responseModel ?? message.model,
        priced,
        costUsd: message.usage.cost.total,
        promptTokens: message.usage.input,
        completionTokens: message.usage.output,
      };
    }
  } catch (reason) {
    void recordAiUsage({
      generation_type: options.feature,
      provider: service,
      model: service === "apple" ? APPLE_MODEL : chosen || "unknown",
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

  void recordAiUsage({
    generation_type: options.feature,
    provider: service,
    model: answered.model,
    input_length: inputLength,
    output_length: answered.text.length,
    input_tokens: answered.promptTokens,
    output_tokens: answered.completionTokens,
    latency_ms: Date.now() - started,
    success: true,
    cached: false,
    ...priceOf(service, answered.model, answered.priced, answered.costUsd),
  });
  // A caller that gave up throws instead of using an answer it no longer wants.
  if (options.signal?.aborted) throw new Error("The request was stopped.");

  return answered.text;
}

/**
 * The writer the space agent runs on.
 *
 * The loop lives in `@september/core`; the desktop lends it a model, a way to
 * stream it, and somewhere to put what each answer spent. Both services answer
 * through the proxy, so neither key ever reaches the WebView.
 */
export async function openAgentWriter(): Promise<AgentWriter> {
  const service = writingService("agent");
  if (!service) throw new Error("Connect writing help in Settings first.");

  const chosen = service === "openrouter" ? configuredModel("agent").model.trim() : "";
  const requested = service === "apple" ? APPLE_MODEL : chosen || FREE_AGENT_MODEL;
  const { models, model, priced, key } = await modelFor(requested, service);
  let asked = 0;
  let sent = 0;

  return {
    model,
    stream: (picked, context: Context, options) => {
      asked = Date.now();
      sent = (context.messages ?? []).reduce(
        (total, message) =>
          total +
          (typeof message.content === "string" ? message.content.length : 0),
        0,
      );
      return models.streamSimple(picked, context, {
        ...options,
        apiKey: key,
        temperature: AGENT_TEMPERATURE,
        maxTokens: AGENT_MAX_TOKENS,
        onPayload: (payload) =>
          shapePayload(payload, { model: requested, tools: true }),
      });
    },
    spent: (message: AssistantMessage) => {
      const failed =
        message.stopReason === "error" || message.stopReason === "aborted";
      const named =
        service === "apple"
          ? APPLE_MODEL
          : (message.responseModel ?? message.model ?? requested);
      void recordAiUsage({
        generation_type: "agent",
        provider: service,
        model: named,
        input_length: sent,
        output_length: failed ? 0 : message.usage.output,
        input_tokens: message.usage.input,
        output_tokens: message.usage.output,
        latency_ms: Date.now() - asked,
        success: !failed,
        cached: false,
        ...priceOf(service, named, priced, message.usage.cost.total),
        ...(failed
          ? {
              error_message:
                message.errorMessage ?? "The writing service did not answer.",
            }
          : {}),
      });
    },
  };
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
  if (!hasWritingService("context")) return null;

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
