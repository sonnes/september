// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Stripe } from '../hooks/use-stripes';
import { stripeForText } from '../lib/stripes';
import { SuggestionStripes } from './suggestion-stripes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no ResizeObserver (used by useStripeScale).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

let mockText = '';
const mockSetText = vi.fn();

vi.mock('@/packages/editor', () => ({
  useEditorContext: () => ({ text: mockText, setText: mockSetText }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockText = '';
  mockSetText.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

function codeStripe(typed: string, expanded: string, code: string): Stripe {
  return { ...stripeForText(expanded, typed), source: 'code', code };
}

describe('SuggestionStripes row kinds', () => {
  it('renders the code chip in the gutter of a code stripe', () => {
    mockText = 'I made it, ty';
    render(
      <SuggestionStripes
        stripes={[codeStripe('I made it, ty', 'I made it, Thank you', 'ty')]}
        pinnedChips={[]}
        onSubmit={() => {}}
      />
    );

    expect(container.textContent).toContain('ty');
    expect(container.querySelector('[data-source="code"]')).toBeTruthy();
  });

  it('taking the code stripe consumes the typed trigger', () => {
    mockText = 'I made it, ty';
    render(
      <SuggestionStripes
        stripes={[codeStripe('I made it, ty', 'I made it, Thank you', 'ty')]}
        pinnedChips={[]}
      />
    );

    // Tap the last visible token ("you") — full take.
    const tokens = [...container.querySelectorAll('button')].filter(
      b => b.textContent === 'you'
    );
    act(() => tokens[0].click());
    expect(mockSetText).toHaveBeenCalledWith('I made it, Thank you ');
  });

  it('renders a starter stripe with a take-prefix key instead of a speak key', () => {
    const stripe: Stripe = { ...stripeForText("I'm feeling a bit", ''), source: 'starter' };
    const onSubmit = vi.fn();
    render(<SuggestionStripes stripes={[stripe]} pinnedChips={[]} onSubmit={onSubmit} />);

    expect(container.querySelector('[aria-label="Start with this prefix"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Speak this suggestion"]')).toBeFalsy();

    const key = container.querySelector<HTMLButtonElement>(
      '[aria-label="Start with this prefix"]'
    )!;
    act(() => key.click());
    // Takes the prefix into the composer; never speaks.
    expect(mockSetText).toHaveBeenCalledWith("I'm feeling a bit ");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('still renders the speak key for phrase stripes', () => {
    const stripe: Stripe = { ...stripeForText('Please call the nurse', ''), source: 'md' };
    render(<SuggestionStripes stripes={[stripe]} pinnedChips={[]} onSubmit={() => {}} />);

    expect(container.querySelector('[aria-label="Speak this suggestion"]')).toBeTruthy();
  });
});
