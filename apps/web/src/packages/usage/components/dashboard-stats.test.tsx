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
  return {
    ...actual,
    useAnalyticsSummary: mockUseAnalyticsSummary,
  };
});

vi.mock('../hooks/use-elevenlabs-quota', () => ({
  useElevenLabsQuota: mockUseElevenLabsQuota,
}));

// The card links into settings; outside a router a plain anchor is enough.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import { DashboardStats } from './dashboard-stats';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockUseElevenLabsQuota.mockReturnValue({
    data: { tier: 'creator', used: 37060, limit: 100000, resets_at: new Date('2026-08-12') },
    isLoading: false,
  });
  mockUseAnalyticsSummary.mockReturnValue({
    isLoading: false,
    summary: {
      messages: {
        total_messages: 227,
        total_keys_typed: 1482,
        total_text_length: 8240,
        efficiency: 82,
      },
      ai_generations: {
        total: 143,
        success_rate: 100,
        avg_latency_ms: 1200,
        by_provider: {},
        avg_input_length: 0,
        avg_output_length: 0,
        total_input_tokens: 18600,
        total_output_tokens: 22600,
        total_tokens: 41200,
        tokens_by_generation_type: {
          suggestions: 24300,
          transcription: 8400,
          summary: 8500,
        },
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
        total_tokens: 41200,
        total_characters: 83020,
        total_credits: 37060,
        failed_calls: 0,
        cached_calls: 0,
        by_provider: {
          gemini: {
            calls: 1290,
            cost_usd: 0.1,
            source: 'estimated',
            input_tokens: 18600,
            output_tokens: 22600,
            characters: 0,
            credits: 0,
            audio_seconds: 0,
          },
          openrouter: {
            calls: 362,
            cost_usd: 0.08,
            source: 'measured',
            input_tokens: 0,
            output_tokens: 0,
            characters: 0,
            credits: 0,
            audio_seconds: 0,
          },
          elevenlabs: {
            calls: 1930,
            cost_usd: 0,
            source: 'quota',
            input_tokens: 0,
            output_tokens: 0,
            characters: 74120,
            credits: 37060,
            audio_seconds: 0,
          },
          kokoro: {
            calls: 276,
            cost_usd: 0,
            source: 'free',
            input_tokens: 0,
            output_tokens: 0,
            characters: 8900,
            credits: 0,
            audio_seconds: 0,
          },
        },
        by_model: {},
        by_feature: {},
        unknown_price_models: [],
      },
      date_range: {
        start_date: new Date('2026-06-15T00:00:00.000Z'),
        end_date: new Date('2026-06-15T23:59:59.999Z'),
      },
    },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

describe('DashboardStats', () => {
  it('renders the simplified two-card dashboard', () => {
    render(<DashboardStats userId="user-1" />);

    const cards = container.querySelectorAll('[data-dashboard-card]');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Efficiency');
    expect(cards[1].textContent).toContain('Spend');
    expect(container.textContent).toContain('82%');
    expect(container.textContent).not.toContain('Token use by task');
    expect(container.textContent).not.toContain('What changed');
    expect(container.textContent).not.toContain('AI Provider Usage');
  });

  it('leads with the money and keeps tokens as the supporting line', () => {
    render(<DashboardStats userId="user-1" />);

    const spend = container.querySelector('[data-dashboard-card="spend"]')!;
    expect(spend.textContent).toContain('$0.18');
    expect(spend.textContent).toContain('41.2k');
    expect(spend.textContent).toContain('3,858');
  });

  it('names each provider with where its number came from', () => {
    render(<DashboardStats userId="user-1" />);

    const spend = container.querySelector('[data-dashboard-card="spend"]')!;
    expect(spend.textContent).toContain('Google Gemini');
    expect(spend.textContent).toContain('Estimated');
    expect(spend.textContent).toContain('OpenRouter');
    expect(spend.textContent).toContain('Measured');
    // On-device work is free, and says so rather than showing a dollar sign.
    expect(spend.textContent).toContain('On this device');
  });

  it('shows prepaid voice credits as a quota, not as dollars', () => {
    render(<DashboardStats userId="user-1" />);

    const spend = container.querySelector('[data-dashboard-card="spend"]')!;
    expect(spend.textContent).toContain('37,060');
    expect(spend.textContent).toContain('100,000');
  });

  it('hides the credits meter when ElevenLabs is not connected', () => {
    mockUseElevenLabsQuota.mockReturnValue({ data: undefined, isLoading: false });

    render(<DashboardStats userId="user-1" />);

    const spend = container.querySelector('[data-dashboard-card="spend"]')!;
    expect(spend.textContent).not.toContain('100,000');
  });

  it('admits when it has no price for a model instead of implying free', () => {
    const summary = mockUseAnalyticsSummary.mock.results[0]?.value;
    mockUseAnalyticsSummary.mockReturnValue({
      isLoading: false,
      summary: {
        ...(summary?.summary ?? {}),
        ...structuredClone({}),
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
          total_calls: 12,
          total_tokens: 5000,
          total_characters: 0,
          total_credits: 0,
          failed_calls: 0,
          cached_calls: 0,
          by_provider: {
            openrouter: {
              calls: 12,
              cost_usd: 0,
              source: 'unknown',
              input_tokens: 4000,
              output_tokens: 1000,
              characters: 0,
              credits: 0,
              audio_seconds: 0,
            },
          },
          by_model: {},
          by_feature: {},
          unknown_price_models: ['openrouter:qwen/qwen3-next-80b'],
        },
        date_range: {
          start_date: new Date('2026-06-15T00:00:00.000Z'),
          end_date: new Date('2026-06-15T23:59:59.999Z'),
        },
      },
    });

    render(<DashboardStats userId="user-1" />);

    const spend = container.querySelector('[data-dashboard-card="spend"]')!;
    expect(spend.textContent).toContain('qwen/qwen3-next-80b');
  });
});
