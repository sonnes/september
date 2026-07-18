// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Note } from '../types';
import { NoteActions } from './note-actions';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSpeak = vi.fn();
const mockStop = vi.fn();
const mockGenerateSpeech = vi.fn();
const voiceState = { isGenerating: false, isPlaying: false };

vi.mock('../hooks/use-slide-voice-over', () => ({
  useSlideVoiceOver: () => ({
    speak: mockSpeak,
    stop: mockStop,
    isGenerating: voiceState.isGenerating,
    isPlaying: voiceState.isPlaying,
  }),
}));

vi.mock('@/packages/speech', () => ({
  useSpeech: () => ({ generateSpeech: mockGenerateSpeech }),
}));

vi.mock('./note-reel-export-panel', () => ({
  NoteReelExportPanel: () => <div data-testid="reel-panel">Reel export panel</div>,
}));

const note: Note = {
  id: 'note-1',
  space_id: 'space-1',
  name: 'Daily note',
  content: 'Thank **you** [friend](https://example.test)',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

const emptyNote: Note = { ...note, content: '' };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockSpeak.mockReset();
  mockStop.mockReset();
  mockGenerateSpeech.mockReset();
  voiceState.isGenerating = false;
  voiceState.isPlaying = false;
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

function byLabel(label: string) {
  return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
}

describe('NoteActions', () => {
  it('disables voice-over, download, and reel when the note has no text', () => {
    render(<NoteActions note={emptyNote} />);
    expect(byLabel('Generate voice-over')?.disabled).toBe(true);
    expect(byLabel('Download audio')?.disabled).toBe(true);
    expect(byLabel('Export reel')?.disabled).toBe(true);
  });

  it('speaks the note text when voice-over is pressed', () => {
    render(<NoteActions note={note} />);
    act(() => byLabel('Generate voice-over')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(mockSpeak).toHaveBeenCalledWith('Thank you friend');
  });

  it('stops playback when voice-over is pressed while playing', () => {
    voiceState.isPlaying = true;
    render(<NoteActions note={note} />);
    expect(byLabel('Stop voice-over')).toBeTruthy();
    act(() => byLabel('Stop voice-over')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(mockStop).toHaveBeenCalled();
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('opens the reel export popover when Reel is pressed', () => {
    render(<NoteActions note={note} />);
    expect(container.querySelector('[data-testid="reel-panel"]')).toBeNull();
    const reel = byLabel('Export reel')!;
    expect(reel.getAttribute('aria-expanded')).toBe('false');
    act(() => reel.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(reel.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[data-testid="reel-panel"]')).toBeTruthy();
  });
});
