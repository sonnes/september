// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Note } from '../types';
import { SpaceNotes } from './space-notes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSpeak = vi.fn();
const mockStop = vi.fn();
const mockCreateNote = vi.fn();
const mockGenerateSpeech = vi.fn();

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

vi.mock('../hooks/use-note-mutations', () => ({
  useCreateNoteMutation: () => ({
    mutateAsync: (...args: unknown[]) => mockCreateNote(...args),
    isPending: false,
  }),
}));

vi.mock('./note-editor', () => ({
  NoteEditor: ({ autoSave }: { autoSave?: boolean }) => (
    <div data-testid="note-editor">{autoSave ? 'autosave' : 'manual'}</div>
  ),
}));

vi.mock('./editable-note-title', () => ({
  EditableNoteTitle: ({ name }: { name?: string }) => <div>{name}</div>,
}));

vi.mock('./note-reel-export-panel', () => ({
  NoteReelExportPanel: () => <div data-testid="reel-panel" />,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockSpeak.mockReset();
  mockStop.mockReset();
  mockCreateNote.mockReset();
  mockGenerateSpeech.mockReset();
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
  it('renders the autosaving editor for the selected note', () => {
    render(<SpaceNotes spaceId="space-1" />);
    expect(container.querySelector('[data-testid="note-editor"]')?.textContent).toBe('autosave');
  });

  it('surfaces per-note voice-over actions in the editor header', () => {
    render(<SpaceNotes spaceId="space-1" />);
    expect(buttonByLabel('Generate voice-over')).toBeTruthy();
    expect(buttonByLabel('Download audio')).toBeTruthy();
    expect(buttonByLabel('Export reel')).toBeTruthy();
  });

  it('speaks the selected note from the header action', () => {
    render(<SpaceNotes spaceId="space-1" />);
    act(() => {
      buttonByLabel('Generate voice-over')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });
    expect(mockSpeak).toHaveBeenCalledWith('Thank you friend');
  });
});
