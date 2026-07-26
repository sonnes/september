/**
 * What a provider call costs.
 *
 * September runs on the user's own API keys, so this is never a bill we issue —
 * it is our best account of what their provider will charge them. Providers bill
 * in three different shapes, so a cost always carries where its number came from:
 *
 * - `measured`  — the provider reported the exact charge for the call (OpenRouter).
 * - `estimated` — tokens × the price table below. Correct until prices move.
 * - `quota`     — prepaid credits (ElevenLabs). There is no per-call dollar price.
 * - `free`      — ran on this device, or a provider's free model.
 * - `unknown`   — we have no price for this model. Usage is still recorded; the
 *                 UI shows a dash. We never guess a number.
 *
 * Prices checked 2026-07-26:
 * - Gemini — https://ai.google.dev/gemini-api/docs/pricing (paid tier)
 * - ElevenLabs — Flash/Turbo bill 0.5 credits per character, Multilingual v2 and
 *   v3 bill 1.0. Authoritative per-model rate lives at `GET /v1/models` →
 *   `model_rates.character_cost_multiplier`.
 *
 * Re-check these when a provider changes pricing; everything derived from the
 * table is labelled `estimated` in the UI precisely because it can drift.
 */

export type CostSource = 'measured' | 'estimated' | 'free' | 'quota' | 'unknown';

export interface Cost {
  /** Absent when there is no dollar price to show (`quota`, `unknown`). */
  amount_usd?: number;
  source: CostSource;
}

export interface SpeechCost extends Cost {
  /** Provider credits consumed, for quota-billed speech. */
  credits?: number;
}

export interface TokenUsage {
  input?: number;
  output?: number;
  /** Bill input at the provider's audio rate (transcription sends audio). */
  audio_input?: boolean;
}

interface TokenPrice {
  input_per_mtok: number;
  output_per_mtok: number;
  /** Audio input is billed at its own, higher rate on Gemini. */
  audio_input_per_mtok?: number;
}

/**
 * USD per 1M tokens, keyed `provider:model`. Exact match only — a model id we
 * have not priced is `unknown`, never the nearest sibling.
 *
 * OpenRouter is deliberately absent: it reports the exact cost of every call,
 * so estimating would be both unnecessary and less accurate.
 */
const TOKEN_PRICES: Record<string, TokenPrice> = {
  'gemini:gemini-2.5-flash-lite': {
    input_per_mtok: 0.1,
    output_per_mtok: 0.4,
    audio_input_per_mtok: 0.3,
  },
  'gemini:gemini-2.5-flash': {
    input_per_mtok: 0.3,
    output_per_mtok: 2.5,
    audio_input_per_mtok: 1.0,
  },
};

/** Credits consumed per character, keyed `provider:model`. */
const SPEECH_RATES: Record<string, number> = {
  'elevenlabs:eleven_v3': 1.0,
  'elevenlabs:eleven_multilingual_v2': 1.0,
  'elevenlabs:eleven_flash_v2_5': 0.5,
  'elevenlabs:eleven_flash_v2': 0.5,
  'elevenlabs:eleven_turbo_v2_5': 0.5,
  'elevenlabs:eleven_turbo_v2': 0.5,
};

/** Providers that run on the user's device and can never cost them anything. */
const FREE_PROVIDERS = new Set(['webllm', 'kokoro', 'whisper', 'browser']);

const FREE: Cost = { amount_usd: 0, source: 'free' };
const UNKNOWN: Cost = { source: 'unknown' };

function isFree(provider: string, model: string): boolean {
  return FREE_PROVIDERS.has(provider) || model.endsWith(':free');
}

/** What a language-model call cost, from token counts. */
export function costOfTokens(provider: string, model: string, usage: TokenUsage): Cost {
  if (isFree(provider, model)) return { ...FREE };

  const price = TOKEN_PRICES[`${provider}:${model}`];
  if (!price) return { ...UNKNOWN };

  const inputRate =
    usage.audio_input && price.audio_input_per_mtok !== undefined
      ? price.audio_input_per_mtok
      : price.input_per_mtok;

  const amount =
    ((usage.input ?? 0) * inputRate + (usage.output ?? 0) * price.output_per_mtok) / 1_000_000;

  return { amount_usd: amount, source: 'estimated' };
}

/** What a speech call cost, from its character count. */
export function costOfSpeech(provider: string, model: string, characters: number): SpeechCost {
  if (isFree(provider, model)) return { ...FREE };

  const rate = SPEECH_RATES[`${provider}:${model}`];
  if (rate === undefined) return { ...UNKNOWN };

  // Providers round a partial credit up, so we do too.
  return { credits: Math.ceil(characters * rate), source: 'quota' };
}

/**
 * Render a cost for display. Small per-call amounts keep their digits so a
 * fraction of a cent never reads as free.
 */
export function formatCost(cost: Cost): string {
  if (cost.amount_usd === undefined) return '—';
  if (cost.amount_usd === 0) return '$0.00';
  if (cost.amount_usd >= 0.01) return `$${cost.amount_usd.toFixed(2)}`;
  if (cost.amount_usd >= 0.00001) return `$${trimZeros(cost.amount_usd.toFixed(5))}`;
  return '<$0.00001';
}

function trimZeros(value: string): string {
  return value.replace(/0+$/, '');
}
