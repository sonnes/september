// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhancedCTASection } from './enhanced-cta-section';
import { FeaturesSection } from './features-section';
import { Footer } from './footer';
import { HeroSection } from './hero-section';
import { HowItWorksSection } from './how-it-works-section';
import { LiveDemoSection } from './live-demo-section';
import { SetupChoicesSection } from './setup-choices-section';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  it('renders the minimal hero copy and actions', () => {
    render(<HeroSection />);

    expect(container.textContent).toContain('Faster Communication.');
    expect(container.textContent).toContain('Fewer Keystrokes.');
    expect(container.textContent).toContain(
      'September helps you write and speak everyday messages with fewer taps.'
    );
    expect(container.textContent).toContain('Start setup');
    expect(container.textContent).toContain('Open source');
    expect(container.textContent).not.toContain('Try Now');

    const panel = container.querySelector('[data-home-hero-panel]');
    expect(panel?.className).toContain('min-h-[300px]');
    expect(panel?.className).not.toContain('min-h-[360px]');
  });

  it('renders a focused live demo of the core communication flow', () => {
    render(<LiveDemoSection />);

    expect(container.textContent).toContain('Type a little.');
    expect(container.textContent).toContain('Tap a suggestion.');
    expect(container.textContent).toContain('Speak.');
    expect(container.textContent).toContain('General');
    expect(container.textContent).not.toContain('Daily Conversations');
    expect(container.textContent).toContain('Good');
    expect(container.textContent).toContain('How was your day?');
    expect(container.textContent).not.toContain('QWERTY');
    expect(container.textContent).not.toContain('Circular');
    expect(container.querySelector('textarea')).toBeTruthy();

    const frame = container.querySelector('[data-live-demo-frame]');
    expect(frame?.className).toContain('lg:h-[560px]');
    expect(frame?.className).not.toContain('lg:h-[760px]');
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
  });

  it('uses app-shaped skeleton previews for each feature card', () => {
    render(<FeaturesSection />);

    expect(container.querySelector('[data-feature-preview="spaces"]')).toBeTruthy();
    expect(container.querySelector('[data-feature-preview="phrases"]')).toBeTruthy();
    expect(container.querySelector('[data-feature-preview="speak"]')).toBeTruthy();
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
    expect(container.textContent).toContain('Start setup');
  });

  it('keeps footer text and links in a simple layout', () => {
    render(<Footer />);

    expect(container.textContent).toContain('Communication with fewer keystrokes.');
    expect(container.textContent).toContain('Privacy');
    expect(container.textContent).toContain('Terms');
    expect(container.querySelector('[data-slot="separator"]')).toBeNull();
  });
});
