// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAnalyticsSummary = vi.hoisted(() => vi.fn());

vi.mock('../use-summary', async importOriginal => {
  const actual = await importOriginal<typeof import('../use-summary')>();
  return {
    ...actual,
    useAnalyticsSummary: mockUseAnalyticsSummary,
  };
});

import { DashboardStats } from './dashboard-stats';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
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
    expect(cards[1].textContent).toContain('AI tokens');
    expect(container.textContent).toContain('82%');
    expect(container.textContent).toContain('41.2k');
    expect(container.textContent).not.toContain('Token use by task');
    expect(container.textContent).not.toContain('What changed');
    expect(container.textContent).not.toContain('AI Provider Usage');
  });
});
