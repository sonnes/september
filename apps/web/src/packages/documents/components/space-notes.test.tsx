// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Document } from '../types';
import { SpaceNotes } from './space-notes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSpeak = vi.fn();
const mockStop = vi.fn();
const mockCreateDocument = vi.fn();
const mockGenerateSpeech = vi.fn();

let mockNotes: Document[] = [];

vi.mock('../hooks/use-documents', () => ({
  useDocuments: () => ({ documents: mockNotes, isLoading: false }),
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

vi.mock('../mutations', () => ({
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
}));

vi.mock('./document-editor', () => ({
  DocumentEditor: ({ autoSave }: { autoSave?: boolean }) => (
    <div data-testid="document-editor">{autoSave ? 'autosave' : 'manual'}</div>
  ),
}));

vi.mock('./editable-document-title', () => ({
  EditableDocumentTitle: ({ name }: { name?: string }) => <div>{name}</div>,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockSpeak.mockReset();
  mockStop.mockReset();
  mockCreateDocument.mockReset();
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

function buttonByText(text: string) {
  return [...container.querySelectorAll('button')].find(button =>
    (button.textContent ?? '').includes(text)
  );
}

describe('SpaceNotes', () => {
  it('shows selected-note voice actions in the notes sidebar', () => {
    render(<SpaceNotes spaceId="space-1" />);

    expect(container.textContent).toContain('Generate voice-over');
    expect(container.textContent).toContain('Download audio');
    expect(container.textContent).not.toContain('Save note');
    expect(container.querySelector('[data-testid="document-editor"]')?.textContent).toBe(
      'autosave'
    );
  });

  it('places selected note actions inside the selected note card', () => {
    render(<SpaceNotes spaceId="space-1" />);

    const selectedCard = container.querySelector('[aria-current="true"]')?.closest('[data-note-card]');

    expect(selectedCard?.textContent).toContain('Generate voice-over');
    expect(selectedCard?.textContent).toContain('Download audio');
  });

  it('speaks the selected note from the sidebar action', () => {
    render(<SpaceNotes spaceId="space-1" />);

    act(() => {
      buttonByText('Generate voice-over')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(mockSpeak).toHaveBeenCalledWith('Thank you friend');
  });
});
