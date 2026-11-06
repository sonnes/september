/**
 * The writing service.
 *
 * One typed client calls the endpoint that the platform gives: OpenRouter or
 * a proxy in front of it, and Apple Intelligence where the platform runs it.
 */

import type { AssistantMessage, Context, Model, Models } from "@earendil-works/pi-ai";

import { platform } from "@platform/adapter";
import type { AgentWriter } from "@september/core/rules/agent/loop";
import {
  modelContextFrom,
  modelTextFrom,
  type ModelIdentity,
} from "@september/core/rules/model-client";
import {
  APPLE_MODEL,
  modelConfigFor,
  modelIdFor,
  type GenerationFeature,
  type WritingModelConfig,
} from "@september/core/rules/model-config";
import type { CostSource } from "@september/core/rules/usage-summary";

import type { Endpoint } from "../platform";
import { currentSetup } from "./settings";
import { recordAiUsage } from "./usage";

export interface GenerateMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: GenerateMessage[];
  temperature?: number;
  response_format?: { type: "json_object" };
}

type Service = "apple" | "openrouter";

const AGENT_MAX_TOKENS = 1_024;
const AGENT_TEMPERATURE = 0.2;

const IDENTITY: ModelIdentity<"openai-completions", "openrouter"> = {
  api: "openai-completions",
  provider: "openrouter",
  model: "",
};

/**
 * The client, built on the first call that needs a model, so a reader who
 * only visits Help never downloads it.
 */
let client: Promise<Models> | null = null;

function models(): Promise<Models> {
  client ??= (async () => {
    const [{ createModels }, { openrouterProvider }] = await Promise.all([
      import("@earendil-works/pi-ai"),
      import("@earendil-works/pi-ai/providers/openrouter"),
    ]);
    const created = createModels();
    created.setProvider(openrouterProvider());
    return created;
  })();
  return client;
}

/**
 * A model the catalog does not list. The user typed its name, and nobody
 * knows its price, so a call to one records no cost.
 */
const unlistedModel = (id: string): Omit<Model<"openai-completions">, "baseUrl"> => ({
  id,
  name: id,
  api: "openai-completions",
  provider: "openrouter",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128_000,
  maxTokens: 8_192,
});

interface ChosenModel {
  models: Models;
  model: Model<"openai-completions">;
  /** The catalog holds the rates of this model, so a cost from it means something. */
  priced: boolean;
  key: string;
}

function endpointOf(service: Service): Promise<Endpoint> {
  if (service === "openrouter") return platform.writing.openrouter();
  if (!platform.writing.apple) {
    throw new Error("Apple Intelligence is not available on this device.");
  }
  return platform.writing.apple.endpoint();
}

/** One model, addressed at the endpoint of the platform. */
async function modelFor(id: string, service: Service): Promise<ChosenModel> {
  const [all, endpoint] = await Promise.all([models(), endpointOf(service)]);
  const known =
    service === "openrouter"
      ? (all.getModel("openrouter", id) as Model<"openai-completions"> | undefined)
      : undefined;
  return {
    models: all,
    model: { ...(known ?? unlistedModel(id)), baseUrl: endpoint.baseUrl },
    priced: known !== undefined,
    key: endpoint.key,
  };
}

/**
 * What one call cost, and how well September knows it. Apple Intelligence
 * and a free model cost nothing. A priced model gives an estimate from its
 * published rates. A model nobody prices gives no number.
 */
function priceOf(
  service: Service,
  model: string,
  priced: boolean,
  costUsd: number | undefined,
): { cost_usd?: number; cost_source: CostSource } {
  if (service === "apple" || model.endsWith(":free")) return { cost_usd: 0, cost_source: "free" };
  if (priced && costUsd !== undefined) return { cost_usd: costUsd, cost_source: "estimated" };
  return { cost_source: "unknown" };
}

/**
 * The parts of a request the typed client has no option for.
 * `parallel_tool_calls` holds the model to one call at a time, which the
 * agent loop requires.
 */
function shapePayload(
  payload: unknown,
  request: { responseFormat?: GenerateRequest["response_format"]; tools?: boolean },
): unknown {
  const body = { ...(payload as Record<string, unknown>) };
  if (request.responseFormat) body.response_format = request.responseFormat;
  if (request.tools) body.parallel_tool_calls = false;
  return body;
}

function configuredModel(feature: GenerationFeature): WritingModelConfig {
  const setup = currentSetup();
  return setup ? modelConfigFor(setup, feature) : { service: "none", model: "" };
}

/** The service configured for one feature, or nothing. */
function writingService(feature: GenerationFeature): Service | null {
  const chosen = configuredModel(feature).service;
  return chosen === "apple" || chosen === "openrouter" ? chosen : null;
}

export const hasWritingService = (feature: GenerationFeature = "agent") =>
  writingService(feature) !== null;

function requestedModel(feature: GenerationFeature): string {
  return modelIdFor(configuredModel(feature));
}

/**
 * What the writing service knows about the user: the speaking style and the
 * personal words from setup. Empty when the user wrote neither.
 */
export function userContext(): string {
  const setup = currentSetup();
  return [setup?.speakingStyle, setup?.personalWords]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Text from the writing service of one feature. */
export async function generate(
  request: GenerateRequest,
  options: { feature: GenerationFeature; signal?: AbortSignal },
): Promise<string> {
  const service = writingService(options.feature);
  if (!service) throw new Error("AI Assistance is not set up.");

  const started = Date.now();
  const requested = requestedModel(options.feature);
  let answered: {
    text: string;
    model: string;
    priced: boolean;
    costUsd?: number;
    promptTokens: number;
    completionTokens: number;
  };
  try {
    const { models: all, model, priced, key } = await modelFor(requested, service);
    const message = await all.complete(
      model,
      modelContextFrom(request.messages, { ...IDENTITY, model: model.id }),
      {
        apiKey: key,
        signal: options.signal,
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        onPayload: (payload) => shapePayload(payload, { responseFormat: request.response_format }),
      },
    );
    answered = {
      text: modelTextFrom(message),
      model: service === "apple" ? APPLE_MODEL : (message.responseModel ?? message.model),
      priced,
      costUsd: message.usage.cost.total,
      promptTokens: message.usage.input,
      completionTokens: message.usage.output,
    };
  } catch (reason) {
    recordAiUsage({
      generation_type: options.feature,
      provider: service,
      model: requested,
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

  recordAiUsage({
    generation_type: options.feature,
    provider: service,
    model: answered.model,
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
 * The writer the space agent runs on. The loop lives in `@september/core`,
 * and this lends it a model, a way to stream it, and a record of what each
 * answer spent.
 */
export async function openAgentWriter(): Promise<AgentWriter> {
  const service = writingService("agent");
  if (!service) throw new Error("Connect AI Assistance in Settings first.");

  const requested = requestedModel("agent");
  const { models: all, model, priced, key } = await modelFor(requested, service);
  let asked = 0;

  return {
    model,
    stream: (picked, context: Context, options) => {
      asked = Date.now();
      return all.streamSimple(picked, context, {
        ...options,
        apiKey: key,
        temperature: AGENT_TEMPERATURE,
        maxTokens: AGENT_MAX_TOKENS,
        onPayload: (payload) => shapePayload(payload, { tools: true }),
      });
    },
    spent: (message: AssistantMessage) => {
      const failed = message.stopReason === "error" || message.stopReason === "aborted";
      const named =
        service === "apple" ? APPLE_MODEL : (message.responseModel ?? message.model ?? requested);
      recordAiUsage({
        generation_type: "agent",
        provider: service,
        model: named,
        input_tokens: message.usage.input,
        output_tokens: message.usage.output,
        latency_ms: Date.now() - asked,
        success: !failed,
        cached: false,
        ...priceOf(service, named, priced, message.usage.cost.total),
        ...(failed
          ? { error_message: message.errorMessage ?? "The writing service did not answer." }
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
