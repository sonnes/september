// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAnalyticsSummary = vi.hoisted(() => vi.fn());
const mockUseRecentCalls = vi.hoisted(() => vi.fn());
const mockUseElevenLabsQuota = vi.hoisted(() => vi.fn());

vi.mock('../use-summary', async importOriginal => {
  const actual = await importOriginal<typeof import('../use-summary')>();
  return { ...actual, useAnalyticsSummary: mockUseAnalyticsSummary };
});
vi.mock('../hooks/use-recent-calls', async importOriginal => {
  const actual = await importOriginal<typeof import('../hooks/use-recent-calls')>();
  return { ...actual, useRecentCalls: mockUseRecentCalls };
});
vi.mock('../hooks/use-elevenlabs-quota', () => ({
  useElevenLabsQuota: mockUseElevenLabsQuota,
}));

import { UsageReport } from './usage-report';

let container: HTMLDivElement;
let root: Root;

function bucket(over: Record<string, unknown> = {}) {
  return {
    calls: 1,
    cost_usd: 0,
    source: 'estimated',
    input_tokens: 0,
    output_tokens: 0,
    characters: 0,
    credits: 0,
    audio_seconds: 0,
    ...over,
  };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  mockUseElevenLabsQuota.mockReturnValue({
    data: { tier: 'creator', used: 37060, limit: 100000, resets_at: new Date('2026-08-12') },
    isLoading: false,
  });

  mockUseRecentCalls.mockReturnValue({
    isLoading: false,
    data: [
      {
        id: '1',
        timestamp: new Date('2026-07-26T14:32:07.000Z'),
        feature: 'suggestions',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        input_tokens: 412,
        output_tokens: 38,
        latency_ms: 410,
        success: true,
        cached: false,
        cost_usd: 0.00006,
        cost_source: 'estimated',
      },
      {
        id: '2',
        timestamp: new Date('2026-07-26T14:31:58.000Z'),
        feature: 'speech',
        provider: 'elevenlabs',
        model: 'eleven_flash_v2_5',
        characters: 96,
        credits: 48,
        latency_ms: 280,
        success: true,
        cached: false,
        cost_source: 'quota',
      },
      {
        id: '3',
        timestamp: new Date('2026-07-26T14:28:44.000Z'),
        feature: 'suggestions',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        latency_ms: 0,
        success: true,
        cached: true,
        cost_usd: 0,
        cost_source: 'free',
      },
      {
        id: '4',
        timestamp: new Date('2026-07-26T14:19:51.000Z'),
        feature: 'suggestions',
        provider: 'openrouter',
        model: 'september/free-stack',
        latency_ms: 2100,
        success: false,
        cached: false,
        cost_usd: 0,
        cost_source: 'free',
        error_message: 'Rate limited',
      },
    ],
  });

  mockUseAnalyticsSummary.mockReturnValue({
    isLoading: false,
    summary: {
      messages: { total_messages: 0, total_keys_typed: 0, total_text_length: 0, efficiency: 0 },
      ai_generations: {
        total: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        by_provider: {},
        avg_input_length: 0,
        avg_output_length: 0,
        total_input_tokens: 712000,
        total_output_tokens: 135100,
        total_tokens: 847100,
        tokens_by_generation_type: {},
      },
      tts_generations: {
        total: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        by_provider: {},
        avg_text_length: 0,
        avg_duration_seconds: 0,
      },
      spend: {
        total_usd: 0.18,
        total_calls: 3858,
        total_tokens: 847100,
        total_characters: 83020,
        total_credits: 37060,
        failed_calls: 14,
        cached_calls: 302,
        by_provider: {},
        by_model: {
          'gemini:gemini-2.5-flash-lite': bucket({
            calls: 1284,
            cost_usd: 0.09,
            input_tokens: 486200,
            output_tokens: 92400,
          }),
          'elevenlabs:eleven_flash_v2_5': bucket({
            calls: 1930,
            source: 'quota',
            characters: 74120,
            credits: 37060,
          }),
          'whisper:onnx-community/whisper-base': bucket({
            calls: 64,
            source: 'free',
            audio_seconds: 760,
          }),
        },
        by_feature: {
          suggestions: bucket({ calls: 1470, cost_usd: 0.08 }),
          extraction: bucket({ calls: 76, cost_usd: 0.04 }),
          speech: bucket({ calls: 1930, source: 'quota', credits: 37060 }),
        },
        unknown_price_models: [],
      },
      date_range: { start_date: new Date(), end_date: new Date() },
    },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() => root.render(<UsageReport userId="user-1" />));
}

describe('UsageReport', () => {
  it('leads with the four totals', () => {
    render();

    const strip = container.querySelector('[data-usage="totals"]')!;
    expect(strip.textContent).toContain('$0.18');
    expect(strip.textContent).toContain('37,060');
    expect(strip.textContent).toContain('847.1k');
    expect(strip.textContent).toContain('3,858');
    expect(strip.textContent).toContain('14 failed');
    expect(strip.textContent).toContain('302 served from cache');
  });

  it('lists one row per service, in plain language, with its source', () => {
    render();

    const table = container.querySelector('[data-usage="by-service"]')!;
    expect(table.textContent).toContain('Google Gemini');
    expect(table.textContent).toContain('gemini-2.5-flash-lite');
    expect(table.textContent).toContain('Estimated');
    expect(table.textContent).toContain('ElevenLabs');
    expect(table.textContent).toContain('Quota');
    expect(table.textContent).toContain('Whisper');
    expect(table.textContent).toContain('On device');
  });

  it('shows speech in credits and language models in tokens', () => {
    render();

    const table = container.querySelector('[data-usage="by-service"]')!;
    expect(table.textContent).toContain('486.2k in');
    expect(table.textContent).toContain('92.4k out');
    expect(table.textContent).toContain('37,060 credits');
    expect(table.textContent).toContain('12:40 audio');
  });

  it('names what the money went on', () => {
    render();

    const features = container.querySelector('[data-usage="by-feature"]')!;
    expect(features.textContent).toContain('Writing help');
    expect(features.textContent).toContain('Text from files');
    expect(features.textContent).toContain('Speaking');
  });

  it('explains each recent call, including the ones that cost nothing', () => {
    render();

    const recent = container.querySelector('[data-usage="recent"]')!;
    expect(recent.textContent).toContain('Reused answer');
    expect(recent.textContent).toContain('Busy — retried');
    expect(recent.textContent).toContain('96 chars → 48 credits');
    expect(recent.textContent).toContain('$0.00006');
  });

  it('offers the ElevenLabs plan as read from the account', () => {
    render();

    const plan = container.querySelector('[data-usage="plan"]')!;
    expect(plan.textContent).toContain('100,000');
    expect(plan.textContent).toContain('62,940 left');
  });

  it('says nothing has happened yet rather than showing empty tables', () => {
    mockUseRecentCalls.mockReturnValue({ isLoading: false, data: [] });
    mockUseAnalyticsSummary.mockReturnValue({ isLoading: false, summary: undefined });

    render();

    expect(container.textContent).toContain('No calls yet');
    expect(container.querySelector('[data-usage="by-service"]')).toBeNull();
  });
});
