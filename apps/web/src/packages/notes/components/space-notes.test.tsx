// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Note } from '../types';
import { SpaceNotes, SpaceNotesPanel } from './space-notes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSpeak = vi.fn();
const mockStop = vi.fn();
const mockCreateNote = vi.fn();
const mockGenerateSpeech = vi.fn();
const { mockRenderReel } = vi.hoisted(() => ({
  mockRenderReel: vi.fn(),
}));

let mockNotes: Note[] = [];

vi.mock('../hooks/use-notes', () => ({
  useNotes: () => ({ notes: mockNotes, isLoading: false }),
}));

vi.mock('../hooks/use-slide-voice-over', () => ({
  useSlideVoiceOver: () => ({
    speak: mockSpeak,
    stop: mockStop,
    isGenerating: false,
    isPlaying: false,
  }),
}));

vi.mock('@/packages/speech', () => ({
  useSpeech: () => ({ generateSpeech: mockGenerateSpeech }),
}));

vi.mock('@/packages/ai', () => ({
  useAISettings: () => ({ speechConfig: { provider: 'elevenlabs' } }),
}));

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: () => mockRenderReel,
    }),
  }),
  useServerFn: () => mockRenderReel,
}));

vi.mock('@tanstack/react-start/server', () => ({
  setResponseHeaders: vi.fn(),
}));

vi.mock('../mutations', () => ({
  createNote: (...args: unknown[]) => mockCreateNote(...args),
}));

vi.mock('./note-editor', () => ({
  NoteEditor: ({ autoSave }: { autoSave?: boolean }) => (
    <div data-testid="note-editor">{autoSave ? 'autosave' : 'manual'}</div>
  ),
}));

vi.mock('./editable-note-title', () => ({
  EditableNoteTitle: ({ name }: { name?: string }) => <div>{name}</div>,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockSpeak.mockReset();
  mockStop.mockReset();
  mockCreateNote.mockReset();
  mockGenerateSpeech.mockReset();
  mockRenderReel.mockReset();
  mockNotes = [
    {
      id: 'note-1',
      space_id: 'space-1',
      name: 'Daily note',
      content: 'Thank **you** [friend](https://example.test)',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
  ];
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

function buttonByLabel(label: string) {
  return container.querySelector(`button[aria-label="${label}"]`);
}

describe('SpaceNotes', () => {
  it('shows selected-note voice actions in the notes sidebar', () => {
    render(<SpaceNotesPanel spaceId="space-1" />);

    expect(buttonByLabel('Generate voice-over')).toBeTruthy();
    expect(buttonByLabel('Download audio')).toBeTruthy();
    expect(buttonByLabel('Export reel')).toBeTruthy();
    expect(container.textContent).not.toContain('Save note');
    expect(container.querySelector('[data-testid="note-editor"]')).toBeNull();
  });

  it('places selected note actions inside the selected note card', () => {
    render(<SpaceNotesPanel spaceId="space-1" />);

    const selectedCard = container
      .querySelector('[aria-current="true"]')
      ?.closest('[data-note-card]');

    expect(selectedCard?.querySelector('button[aria-label="Generate voice-over"]')).toBeTruthy();
    expect(selectedCard?.querySelector('button[aria-label="Download audio"]')).toBeTruthy();
    expect(selectedCard?.querySelector('button[aria-label="Export reel"]')).toBeTruthy();
    expect(selectedCard?.textContent).not.toContain('Generate voice-over');
    expect(selectedCard?.textContent).not.toContain('Download audio');
    expect(selectedCard?.textContent).not.toContain('Export reel');
  });

  it('speaks the selected note from the sidebar action', () => {
    render(<SpaceNotesPanel spaceId="space-1" />);

    act(() => {
      buttonByLabel('Generate voice-over')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(mockSpeak).toHaveBeenCalledWith('Thank you friend');
  });

  it('keeps the notes selector out of the editor surface', () => {
    render(<SpaceNotes spaceId="space-1" />);

    expect(container.querySelector('[data-notes-panel]')).toBeNull();
    expect(container.querySelector('[data-testid="note-editor"]')?.textContent).toBe('autosave');
  });
});
