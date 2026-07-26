/**
 * Plain-language names for the usage screens.
 *
 * The audience for these screens is the person paying the bill, not the person
 * who wrote the code — so a stored `generation_type` of `extraction` reads as
 * "Text from files", and a provider that runs locally says so.
 */

import { CostSource } from './pricing';

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  elevenlabs: 'ElevenLabs',
  kokoro: 'Kokoro',
  whisper: 'Whisper',
  webllm: 'Browser AI',
  browser: 'Browser voice',
};

/** Providers that run on the user's own machine and can never be charged for. */
export const ON_DEVICE_PROVIDERS = new Set(['kokoro', 'whisper', 'webllm', 'browser']);

const FEATURE_LABELS: Record<string, string> = {
  suggestions: 'Writing help',
  transcription: 'Listening',
  summary: 'Summaries',
  extraction: 'Text from files',
  phrases: 'Space phrases',
  context: 'Space memory',
  speech: 'Speaking',
  voice_clone: 'Voice cloning',
};

const SOURCE_LABELS: Record<CostSource, string> = {
  measured: 'Measured',
  estimated: 'Estimated',
  quota: 'Quota',
  free: 'On device',
  unknown: 'No price',
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

export function sourceLabel(source: CostSource): string {
  return SOURCE_LABELS[source] ?? source;
}

export function isOnDevice(provider: string): boolean {
  return ON_DEVICE_PROVIDERS.has(provider);
}
