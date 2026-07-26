// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAnalyticsSummary = vi.hoisted(() => vi.fn());
const mockUseElevenLabsQuota = vi.hoisted(() => vi.fn());

vi.mock('../use-summary', async importOriginal => {
  const actual = await importOriginal<typeof import('../use-summary')>();
  return { ...actual, useAnalyticsSummary: mockUseAnalyticsSummary };
});
vi.mock('../hooks/use-elevenlabs-quota', () => ({
  useElevenLabsQuota: mockUseElevenLabsQuota,
}));

import { ProviderSpendChip } from './provider-spend-chip';

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

function summaryWith(byProvider: Record<string, unknown>) {
  return {
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
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
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
        total_usd: 0,
        total_calls: 0,
        total_tokens: 0,
        total_characters: 0,
        total_credits: 0,
        failed_calls: 0,
        cached_calls: 0,
        by_provider: byProvider,
        by_model: {},
        by_feature: {},
        unknown_price_models: [],
      },
      date_range: { start_date: new Date(), end_date: new Date() },
    },
  };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockUseElevenLabsQuota.mockReturnValue({ data: undefined, isLoading: false });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(provider: string) {
  act(() => root.render(<ProviderSpendChip provider={provider} userId="user-1" />));
}

describe('ProviderSpendChip', () => {
  it('shows an estimated provider as approximate', () => {
    mockUseAnalyticsSummary.mockReturnValue(
      summaryWith({ gemini: bucket({ calls: 1284, cost_usd: 0.1, source: 'estimated' }) })
    );

    render('gemini');

    expect(container.textContent).toBe('~$0.10 this month');
  });

  it('drops the tilde when the provider reported the cost itself', () => {
    mockUseAnalyticsSummary.mockReturnValue(
      summaryWith({ openrouter: bucket({ calls: 22, cost_usd: 0.08, source: 'measured' }) })
    );

    render('openrouter');

    expect(container.textContent).toBe('$0.08 this month');
  });

  it('shows ElevenLabs against its allowance when the plan is known', () => {
    mockUseElevenLabsQuota.mockReturnValue({
      data: { tier: 'creator', used: 37060, limit: 100000 },
      isLoading: false,
    });
    mockUseAnalyticsSummary.mockReturnValue(
      summaryWith({ elevenlabs: bucket({ calls: 1930, source: 'quota', credits: 37060 }) })
    );

    render('elevenlabs');

    expect(container.textContent).toBe('37% of credits');
  });

  it('falls back to a credit count when the plan is unknown', () => {
    mockUseAnalyticsSummary.mockReturnValue(
      summaryWith({ elevenlabs: bucket({ calls: 5, source: 'quota', credits: 1200 }) })
    );

    render('elevenlabs');

    expect(container.textContent).toBe('1,200 credits');
  });

  it('celebrates on-device work as free', () => {
    mockUseAnalyticsSummary.mockReturnValue(
      summaryWith({ kokoro: bucket({ calls: 210, source: 'free' }) })
    );

    render('kokoro');

    expect(container.textContent).toBe('Always free');
  });

  it('renders nothing for a provider that has not been used', () => {
    mockUseAnalyticsSummary.mockReturnValue(summaryWith({}));

    render('gemini');

    expect(container.textContent).toBe('');
  });

  it('renders nothing while the summary is still loading', () => {
    mockUseAnalyticsSummary.mockReturnValue({ isLoading: true, summary: undefined });

    render('gemini');

    expect(container.textContent).toBe('');
  });
});
