// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Note } from '../types';
import { NoteReelExportDialog } from './note-reel-export-dialog';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  generateSpeech: vi.fn(),
  renderReel: vi.fn(),
  speechConfig: { provider: 'elevenlabs' },
}));

vi.mock('@/packages/speech', () => ({
  useSpeech: () => ({ generateSpeech: mocks.generateSpeech }),
}));

vi.mock('@/packages/ai', () => ({
  useAISettings: () => ({ speechConfig: mocks.speechConfig }),
}));

vi.mock('@tanstack/react-start', () => ({
  useServerFn: () => mocks.renderReel,
}));

vi.mock('../lib/reel-export.functions', () => ({
  renderNoteReelVideoFn: vi.fn(),
}));

vi.mock('@/packages/audio', () => ({
  ReelTextViewer: ({ text }: { text: string }) => <div data-testid="reel-preview">{text}</div>,
}));

class MockAudio {
  duration = 1.25;
  preload = '';
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onloadedmetadata?.());
  }
}

vi.stubGlobal('Audio', MockAudio);

const note: Note = {
  id: 'note-1',
  space_id: 'space-1',
  name: 'Daily note',
  content: 'Hello world',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

const alignment = {
  characters: Array.from('Hello world'),
  start_times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
  end_times: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mocks.generateSpeech.mockReset();
  mocks.renderReel.mockReset();
  mocks.speechConfig.provider = 'elevenlabs';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

function bodyButton(label: string): HTMLButtonElement {
  const button = document.body.querySelector(`button[aria-label="${label}"], button`);
  if (!button) throw new Error(`Button not found: ${label}`);
  return button as HTMLButtonElement;
}

describe('NoteReelExportDialog', () => {
  it('generates speech timing, renders a video, and exposes an MP4 download', async () => {
    mocks.generateSpeech.mockResolvedValue({
      blob: 'data:audio/mp3;base64,QUJD',
      alignment,
    });
    mocks.renderReel.mockResolvedValue({
      base64: 'bXA0',
      contentType: 'video/mp4',
    });

    render(<NoteReelExportDialog note={note} voiceText="Hello world" />);

    act(() => {
      bodyButton('Export reel').click();
    });

    await act(async () => {
      const generateButton = [...document.body.querySelectorAll('button')].find(
        button => button.textContent === 'Generate reel'
      ) as HTMLButtonElement;
      generateButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.generateSpeech).toHaveBeenCalledWith('Hello world');
    expect(mocks.renderReel).toHaveBeenCalledWith({
      data: {
        audioDataUri: 'data:audio/mp3;base64,QUJD',
        durationSeconds: 1.25,
        captions: [
          {
            startTime: 0,
            endTime: 1.1,
            words: [
              { text: 'Hello', startTime: 0, endTime: 0.5 },
              { text: 'world', startTime: 0.6, endTime: 1.1 },
            ],
          },
        ],
      },
    });
    expect(document.body.querySelector('a[download="daily-note-reel.mp4"]')).toBeTruthy();
  });
});
