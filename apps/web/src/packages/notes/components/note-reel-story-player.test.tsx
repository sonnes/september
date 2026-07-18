// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Alignment } from '@/packages/audio';

import { NoteReelStoryPlayer } from './note-reel-story-player';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const voiceOver = vi.hoisted(() => ({
  alignment: null as Alignment | null,
  currentTime: 0,
  isGenerating: false,
  isPlaying: true,
  speak: vi.fn(),
  stop: vi.fn(),
  seek: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}));

vi.mock('../hooks/use-slide-voice-over', () => ({
  useSlideVoiceOver: () => voiceOver,
}));

// Capture the props handed to the shared renderer instead of measuring layout.
vi.mock('@/packages/audio', () => ({
  ReelRenderer: (props: {
    text: string;
    fontFamily?: string;
    color?: string;
    activeColor?: string;
  }) => (
    <div
      data-testid="reel-renderer"
      data-font={props.fontFamily}
      data-color={props.color}
      data-active-color={props.activeColor}
    >
      {props.text}
    </div>
  ),
}));

/** Even per-character timing (0.1s each) so word/caption times are predictable. */
function evenAlignment(text: string): Alignment {
  const characters = Array.from(text);
  const start_times = characters.map((_, i) => i * 0.1);
  const end_times = characters.map((_, i) => (i + 1) * 0.1);
  return { characters, start_times, end_times };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  voiceOver.currentTime = 0;
  voiceOver.isGenerating = false;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

async function renderPlayer(ui: React.ReactElement) {
  await act(async () => {
    root.render(ui);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('NoteReelStoryPlayer', () => {
  it('renders a sentence-opening chunk with the display serif in the pair tints', async () => {
    voiceOver.alignment = evenAlignment('Hi there.');
    await renderPlayer(<NoteReelStoryPlayer voiceText="Hi there." onClose={() => {}} />);

    const renderer = document.querySelector('[data-testid="reel-renderer"]');
    expect(renderer?.textContent).toBe('Hi there.');
    expect(renderer?.getAttribute('data-font')).toContain('Playfair Display');
    // stone pair: display amber-200, support stone-50
    expect(renderer?.getAttribute('data-color')).toBe('#fde68a');
    expect(renderer?.getAttribute('data-active-color')).toBe('#fafaf9');
  });

  it('renders a continuation chunk with the support sans face', async () => {
    // "one two three, four five" → caption 1 "one two three," (display),
    // caption 2 "four five" (support, follows a comma not a sentence end).
    voiceOver.alignment = evenAlignment('one two three, four five');
    voiceOver.currentTime = 100; // past the end → last (support) caption is active
    await renderPlayer(<NoteReelStoryPlayer voiceText="one two three, four five" onClose={() => {}} />);

    const renderer = document.querySelector('[data-testid="reel-renderer"]');
    expect(renderer?.textContent).toBe('four five');
    expect(renderer?.getAttribute('data-font')).toContain('Noto Sans');
  });

  it('shows the September watermark and a pair-tinted frame', async () => {
    voiceOver.alignment = evenAlignment('Hi there.');
    await renderPlayer(
      <NoteReelStoryPlayer voiceText="Hi there." pairKey="emerald" onClose={() => {}} />
    );

    expect(document.body.textContent).toContain('September');
    expect(document.querySelector('.bg-emerald-950')).toBeTruthy();
  });
});
