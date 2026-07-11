// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SPACE_SEED } from '@/packages/spaces';

import { EnhancedCTASection } from './enhanced-cta-section';
import { FeaturesSection } from './features-section';
import { Footer } from './footer';
import { HeroSection } from './hero-section';
import { HowItWorksSection } from './how-it-works-section';
import { LiveDemoSection } from './live-demo-section';
import { SetupChoicesSection } from './setup-choices-section';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lacks ResizeObserver, which the live demo's SuggestionStripes uses to
// measure its container. Stub it; clientWidth is 0 in jsdom so the scale math
// short-circuits to 1 and never touches the layout engine.
class ResizeObserverStub {
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
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

describe('home redesign sections', () => {
  it('renders the hero copy and actions', () => {
    render(<HeroSection />);

    expect(container.textContent).toContain('Faster Communication');
    expect(container.textContent).toContain('Fewer Keystrokes');
    expect(container.textContent).toContain(
      'A communication assistant for people living with ALS, MND, and other speech & motor difficulties'
    );
    expect(container.textContent).toContain('Get Started');
    expect(container.textContent).toContain('Open Source');
    // One CTA label everywhere — no competing "Try Now".
    expect(container.textContent).not.toContain('Try Now');
  });

  it('answers cost and privacy in the hero', () => {
    render(<HeroSection />);

    expect(container.textContent).toContain('Free to use.');
    expect(container.textContent).toContain('Your words can stay on this device.');
  });

  it('keeps hero actions accessible for motor-impaired users', () => {
    render(<HeroSection />);

    const getStarted = [...container.querySelectorAll('a')].find(anchor =>
      anchor.className.includes('bg-amber-500')
    )!;
    expect(getStarted).toBeTruthy();
    expect(getStarted.textContent?.trim()).toBe('Get Started');
    expect(getStarted.className).not.toContain('text-white');
    expect(getStarted.className).toContain('text-amber-950');

    // Nav pill and hero CTA share the unified label; both keep 44px height.
    const onboardingLinks = [...container.querySelectorAll('a')].filter(
      anchor => anchor.textContent?.trim() === 'Get Started'
    );
    expect(onboardingLinks).toHaveLength(2);
    for (const link of onboardingLinks) {
      expect(link.className).toContain('h-11');
      expect(link.className).not.toContain('py-1.5');
    }

    const logo = container.querySelector('img[alt="September Logo"]')!;
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('loading')).not.toBe('lazy');

    // Both GitHub marks come from lucide — no hand-rolled fill SVG.
    expect(container.querySelectorAll('svg.lucide-github')).toHaveLength(2);
    expect(container.querySelector('svg[fill="currentColor"]')).toBeNull();
  });

  it('renders a focused live demo of the core communication flow', () => {
    render(<LiveDemoSection />);

    expect(container.textContent).toContain('Type a little.');
    expect(container.textContent).toContain('Tap a suggestion.');
    expect(container.textContent).toContain('Speak.');
    expect(container.textContent).toContain(DEFAULT_SPACE_SEED.title);
    expect(container.textContent).not.toContain('Daily Conversations');
    expect(container.textContent).not.toContain('Reyu');
    expect(container.textContent).toContain('Hello');
    expect(container.textContent).toContain('Please');
    expect(container.textContent).toContain('Thank you');
    expect(container.textContent).toContain('Help');
    expect(container.textContent).toContain('Good');
    expect(container.textContent).toContain('Yes');
    expect(container.textContent).toContain(DEFAULT_SPACE_SEED.phrases[0].text);
    expect(container.textContent).toContain(DEFAULT_SPACE_SEED.phrases[1].text.split(' ')[0]);
    expect(container.textContent).not.toContain('QWERTY');
    expect(container.textContent).not.toContain('Circular');
    expect(container.querySelector('textarea')).toBeTruthy();
    expect(container.querySelector('[aria-label="Demo navigation"]')).toBeNull();

    const frame = container.querySelector('[data-live-demo-frame]');
    expect(frame?.className).toContain('lg:h-[560px]');
    expect(frame?.className).not.toContain('lg:h-[760px]');
  });

  it('lets the live demo frame grow on mobile instead of clipping', () => {
    render(<LiveDemoSection />);

    const frame = container.querySelector('[data-live-demo-frame]')!;
    // No fixed height below sm — the frame must not clip wrapped chips/stripes.
    expect(frame.classList.contains('h-[520px]')).toBe(false);
    expect(frame.classList.contains('min-h-[520px]')).toBe(true);
    // Fixed heights return at sm+ so the desktop look is unchanged.
    expect(frame.classList.contains('sm:h-[540px]')).toBe(true);
    expect(frame.classList.contains('lg:h-[560px]')).toBe(true);
  });

  it('gives the live demo full section weight and a seeded transcript', () => {
    render(<LiveDemoSection />);

    // Same rhythm as the other sections: py-16 and the large heading scale.
    expect(container.querySelector('section')!.className).toContain('py-16');
    expect(container.querySelector('h2')!.className).toContain('sm:text-5xl');

    // A pre-spoken message so the transcript reads as live, not a screenshot.
    expect(container.textContent).toContain('Good morning! Ready when you are.');

    // The static speaker pill must not pretend to be a dropdown.
    expect(container.querySelector('svg.lucide-chevron-down')).toBeNull();
  });

  it('has no dead #how anchor on the live demo section', () => {
    render(<LiveDemoSection />);

    expect(container.querySelector('#how')).toBeNull();
    expect(container.querySelector('section')!.id).toBe('');
  });

  it('gives the demo Speak button a 44px minimum touch target', () => {
    render(<LiveDemoSection />);

    const speakButton = [...container.querySelectorAll('button')].find(
      button => button.textContent?.trim() === 'Speak'
    )!;
    expect(speakButton.classList.contains('min-h-11')).toBe(true);
  });

  it('hides the horizontal scrollbar on suggestion stripe rows', () => {
    render(<LiveDemoSection />);

    const rows = [...container.querySelectorAll('.overflow-x-auto')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).toContain('[scrollbar-width:none]');
      expect(row.className).toContain('[&::-webkit-scrollbar]:hidden');
    }
  });

  it('lets the live demo speak the current editor text', () => {
    render(<LiveDemoSection />);

    const textarea = container.querySelector('textarea')!;
    const speakButton = [...container.querySelectorAll('button')].find(
      button => button.textContent?.trim() === 'Speak'
    )!;

    act(() => {
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      speakButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Good');
  });

  it('uses simple feature language', () => {
    render(<FeaturesSection />);

    expect(container.textContent).toContain('Simple tools for everyday conversations.');
    expect(container.textContent).toContain('Conversation spaces');
    expect(container.textContent).toContain('One-tap phrases');
    expect(container.textContent).toContain('Speak out loud');
    expect(container.textContent).toContain('Notes for longer thoughts');
    expect(container.textContent).toContain('Reels from notes');

    // Intro sits on bg-zinc-100 — zinc-500 is under AA there, zinc-600 passes.
    const intro = [...container.querySelectorAll('p')].find(p =>
      p.textContent?.includes('Each part has a simple job')
    )!;
    expect(intro.className).toContain('text-zinc-600');
  });

  it('uses app-shaped skeleton previews for each feature card', () => {
    render(<FeaturesSection />);

    expect(container.querySelector('[data-feature-preview="spaces"]')).toBeTruthy();
    expect(container.querySelector('[data-feature-preview="phrases"]')).toBeTruthy();
    expect(container.querySelector('[data-feature-preview="speak"]')).toBeTruthy();
    expect(container.querySelector('[data-feature-preview="notes"]')).toBeTruthy();
    expect(container.querySelector('[data-feature-preview="reels"]')).toBeTruthy();
    const previews = [...container.querySelectorAll('[data-feature-preview]')];
    expect(previews).toHaveLength(5);
    expect(previews.every(preview => preview.className.includes('h-56'))).toBe(true);
    const speakControls = container.querySelector('[data-feature-preview-controls="speak"]');
    expect(speakControls).toBeTruthy();
    expect(speakControls!.className).toContain(
      'grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_4.5rem]'
    );
    const speakButton = container.querySelector('[data-feature-preview-speak-button]');
    expect(speakButton).toBeTruthy();
    expect(speakButton!.className).toContain('w-full');
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(10);
  });

  it('explains the message flow in three steps', () => {
    render(<HowItWorksSection />);

    expect(container.textContent).toContain('From thought to spoken message.');
    expect(container.textContent).toContain('Choose a situation');
    expect(container.textContent).toContain('Tap words or phrases');
    expect(container.textContent).toContain('Press Speak');
  });

  it('shows privacy, free AI, and bring-your-own-key modes', () => {
    render(<SetupChoicesSection />);

    expect(container.textContent).toContain('Choose the setup that feels right.');
    expect(container.textContent).toContain('Privacy mode');
    expect(container.textContent).toContain('Everything stays on this device.');
    expect(container.textContent).toContain('Free AI mode');
    expect(container.textContent).toContain('OpenRouter');
    expect(container.textContent).toContain('Use your own services');
    expect(container.textContent).toContain(
      'Add your own Gemini, OpenRouter, or ElevenLabs access key.'
    );
  });

  it('keeps the final call to action plain', () => {
    render(<EnhancedCTASection />);

    expect(container.textContent).toContain('Start with one daily conversation.');
    expect(container.textContent).toContain(
      'Create a space, save a phrase, and try speaking one message.'
    );
    expect(container.textContent).toContain('Get Started');
    expect(container.textContent).not.toContain('Start setup');
  });

  it('keeps footer text and links in a simple layout', () => {
    render(<Footer />);

    expect(container.textContent).toContain('Communication with fewer keystrokes.');
    expect(container.textContent).toContain('Privacy');
    expect(container.textContent).toContain('Terms');
    expect(container.querySelector('[data-slot="separator"]')).toBeNull();
  });
});
