import type { AssistantMessage, Context, Model, Models } from '@earendil-works/pi-ai';

import { currentSetup, providerKey } from '@/services/os';
import { recordAiUsage, type GenerationFeature } from '@/services/usage';
import {
  modelContextFrom,
  modelTextFrom,
  type AgentWriter,
  type ModelIdentity,
} from '@september/core/rules/agent';
import { modelConfigFor, type WritingModelConfig } from '@september/core/rules/model-config';
import type { CostSource } from '@september/core/rules/usage-summary';
import {
  buildSpaceContextPrompt,
  spaceDescriptionFrom,
  type SpaceDescription,
} from '@/rules/prompts';

/**
 * The writing service.
 *
 * The browser calls OpenRouter through one typed client, with the key from
 * IndexedDB. Apple Intelligence remains visible as a desktop-only service.
 */
export interface GenerateMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateRequest {
  messages: GenerateMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' } | { type: 'json_schema'; name: string; schema: object };
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const FREE_AGENT_MODEL = 'openrouter/free';
const AGENT_MAX_TOKENS = 1_024;
const AGENT_TEMPERATURE = 0.2;

const IDENTITY: ModelIdentity<'openai-completions', 'openrouter'> = {
  api: 'openai-completions',
  provider: 'openrouter',
  model: '',
};

/**
 * The client, built once and kept.
 *
 * It loads on the first call that needs a model, so a reader who only visits
 * the landing page or a Help guide never downloads it.
 */
let client: Promise<Models> | null = null;

function openRouter(): Promise<Models> {
  client ??= (async () => {
    const [{ createModels }, { openrouterProvider }] = await Promise.all([
      import('@earendil-works/pi-ai'),
      import('@earendil-works/pi-ai/providers/openrouter'),
    ]);
    const models = createModels();
    models.setProvider(openrouterProvider());
    return models;
  })();
  return client;
}

/**
 * A model the catalog does not list.
 *
 * The user typed its name, so September asks for it. Nobody knows its price,
 * which is why a call to one records no cost rather than a wrong one.
 */
const unlistedModel = (id: string): Model<'openai-completions'> => ({
  id,
  name: id,
  api: 'openai-completions',
  provider: 'openrouter',
  baseUrl: OPENROUTER_BASE,
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128_000,
  maxTokens: 8_192,
});

interface ChosenModel {
  models: Models;
  model: Model<'openai-completions'>;
  /** The catalog holds this model's rates, so a cost from it means something. */
  priced: boolean;
}

async function modelFor(id: string): Promise<ChosenModel> {
  const models = await openRouter();
  const known = models.getModel('openrouter', id) as Model<'openai-completions'> | undefined;
  return { models, model: known ?? unlistedModel(id), priced: known !== undefined };
}

/**
 * What one call cost, and how well September knows it.
 *
 * A free model costs nothing and says so. A priced model gives an estimate
 * from its published rates and the tokens it used. A model nobody prices
 * gives a number nobody should trust, so it gives none.
 */
function priceOf(
  model: string,
  priced: boolean,
  costUsd: number | undefined
): { cost_usd?: number; cost_source: CostSource } {
  if (model.endsWith(':free')) return { cost_usd: 0, cost_source: 'free' };
  if (priced && costUsd !== undefined) return { cost_usd: costUsd, cost_source: 'estimated' };
  return { cost_source: 'unknown' };
}

/**
 * The parts of a request the typed client has no option for.
 *
 * `response_format` carries the JSON mode that Suggestions and the space
 * description rely on. `parallel_tool_calls` holds the model to one call at a
 * time, which the agent loop requires. An empty model is removed so that the
 * service picks, exactly as it did before.
 */
function shapePayload(
  payload: unknown,
  request: { model: string; responseFormat?: GenerateRequest['response_format']; tools?: boolean }
): unknown {
  const body = { ...(payload as Record<string, unknown>) };
  if (!request.model) delete body.model;
  if (request.responseFormat) body.response_format = request.responseFormat;
  if (request.tools) body.parallel_tool_calls = false;
  return body;
}

function configuredModel(feature: GenerationFeature): WritingModelConfig {
  const setup = currentSetup();
  return setup ? modelConfigFor(setup, feature) : { service: 'none', model: '' };
}

/** The service configured for one feature, or nothing. */
export function writingService(
  feature: GenerationFeature = 'agent'
): 'apple' | 'openrouter' | null {
  const chosen = configuredModel(feature).service;
  return chosen === 'apple' || chosen === 'openrouter' ? chosen : null;
}

export const hasWritingService = (feature: GenerationFeature = 'agent') =>
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
    .map(part => part?.trim())
    .filter(Boolean)
    .join('\n\n');
}

/** The key the browser holds for OpenRouter, or the reason it has none. */
function openRouterKey(): string {
  const key = providerKey('openrouter');
  if (!key) throw new Error('Connect OpenRouter in Settings first.');
  return key;
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
  options: { feature: GenerationFeature; signal?: AbortSignal }
): Promise<string> {
  const config = configuredModel(options.feature);
  const service = writingService(options.feature);
  if (!service) throw new Error('Writing help is not set up.');
  if (service === 'apple') throw new Error('Apple Intelligence is available in the macOS app.');

  const started = Date.now();
  const inputLength = request.messages.reduce(
    (total, message) => total + message.content.length,
    0
  );
  const chosen = config.model.trim();
  let answered: {
    text: string;
    model: string;
    priced: boolean;
    costUsd?: number;
    promptTokens: number;
    completionTokens: number;
  };
  try {
    const key = openRouterKey();
    const { models, model, priced } = await modelFor(chosen || FREE_AGENT_MODEL);
    const message = await models.complete(
      model,
      modelContextFrom(request.messages, { ...IDENTITY, model: model.id }),
      {
        apiKey: key,
        signal: options.signal,
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        ...(request.max_tokens === undefined ? {} : { maxTokens: request.max_tokens }),
        onPayload: payload =>
          shapePayload(payload, { model: chosen, responseFormat: request.response_format }),
      }
    );
    answered = {
      text: modelTextFrom(message),
      model: message.responseModel ?? message.model,
      priced,
      costUsd: message.usage.cost.total,
      promptTokens: message.usage.input,
      completionTokens: message.usage.output,
    };
  } catch (reason) {
    void recordAiUsage({
      generation_type: options.feature,
      provider: 'openrouter',
      model: chosen || 'unknown',
      input_length: inputLength,
      output_length: 0,
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: Date.now() - started,
      success: false,
      cached: false,
      cost_source: 'unknown',
      error_message: reason instanceof Error ? reason.message : String(reason),
    });
    throw reason;
  }

  void recordAiUsage({
    generation_type: options.feature,
    provider: 'openrouter',
    model: answered.model,
    input_length: inputLength,
    output_length: answered.text.length,
    input_tokens: answered.promptTokens,
    output_tokens: answered.completionTokens,
    latency_ms: Date.now() - started,
    success: true,
    cached: false,
    ...priceOf(answered.model, answered.priced, answered.costUsd),
  });
  // A caller that gave up throws instead of using an answer it no longer wants.
  if (options.signal?.aborted) throw new Error('The request was stopped.');

  return answered.text;
}

/**
 * The writer the space agent runs on.
 *
 * The loop lives in `@september/core`; the browser lends it a model, a way to
 * stream it, and somewhere to put what each answer spent.
 */
export async function openAgentWriter(): Promise<AgentWriter> {
  const service = writingService('agent');
  if (!service) throw new Error('Connect writing help in Settings first.');
  if (service === 'apple') {
    throw new Error('Apple Intelligence agent tools are available in the macOS app.');
  }

  const key = openRouterKey();
  const requested = configuredModel('agent').model.trim() || FREE_AGENT_MODEL;
  const { models, model, priced } = await modelFor(requested);
  let asked = 0;
  let sent = 0;

  return {
    model,
    stream: (chosen, context: Context, options) => {
      asked = Date.now();
      sent = (context.messages ?? []).reduce(
        (total, message) =>
          total + (typeof message.content === 'string' ? message.content.length : 0),
        0
      );
      return models.streamSimple(chosen, context, {
        ...options,
        apiKey: key,
        temperature: AGENT_TEMPERATURE,
        maxTokens: AGENT_MAX_TOKENS,
        onPayload: payload => shapePayload(payload, { model: requested, tools: true }),
      });
    },
    spent: (message: AssistantMessage) => {
      const failed = message.stopReason === 'error' || message.stopReason === 'aborted';
      const named = message.responseModel ?? message.model ?? requested;
      void recordAiUsage({
        generation_type: 'agent',
        provider: 'openrouter',
        model: named,
        input_length: sent,
        output_length: failed ? 0 : message.usage.output,
        input_tokens: message.usage.input,
        output_tokens: message.usage.output,
        latency_ms: Date.now() - asked,
        success: !failed,
        cached: false,
        ...priceOf(named, priced, message.usage.cost.total),
        ...(failed
          ? { error_message: message.errorMessage ?? 'The writing service did not answer.' }
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
      ? value.filter((item): item is string => typeof item === 'string')
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
  { signal }: { signal?: AbortSignal } = {}
): Promise<SpaceDescription | null> {
  if (!hasWritingService('context')) return null;

  const { system, user } = buildSpaceContextPrompt(messageText);
  const answer = await generate(
    {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    },
    { feature: 'context', signal }
  );

  return spaceDescriptionFrom(answer);
}
