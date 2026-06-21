// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type UseNoteEditorReturn, useNoteEditor } from './use-note-editor';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUpdateNote = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
let mockNoteContent = 'Original';
let mockNoteName: string | undefined;

vi.mock('../mutations', () => ({
  updateNote: (...args: unknown[]) => mockUpdateNote(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('./use-note', () => ({
  useNote: () => ({
    note: {
      id: 'note-1',
      name: mockNoteName,
      content: mockNoteContent,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
    isLoading: false,
  }),
}));

let container: HTMLDivElement;
let root: Root;
let latest: UseNoteEditorReturn;
let didUnmount: boolean;

beforeEach(() => {
  vi.useFakeTimers();
  mockNoteContent = 'Original';
  mockNoteName = undefined;
  mockUpdateNote.mockReset();
  mockUpdateNote.mockResolvedValue(undefined);
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  didUnmount = false;
});

afterEach(() => {
  if (!didUnmount) {
    act(() => root.unmount());
  }
  container.remove();
  vi.useRealTimers();
});

function Harness() {
  latest = useNoteEditor({ noteId: 'note-1', autoSave: true });
  return null;
}

function render() {
  act(() => root.render(<Harness />));
}

describe('useNoteEditor', () => {
  it('auto-saves edited note content without a manual save', async () => {
    render();

    act(() => latest.handleContentChange('<p>Updated note</p>', 'Updated note'));
    expect(mockUpdateNote).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', {
      content: 'Updated note',
      name: 'Updated note',
    });
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('does not replace an existing note title on auto-save', async () => {
    mockNoteName = 'Care plan';
    render();

    act(() => latest.handleContentChange('<p>Updated note</p>', 'Updated note'));

    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { content: 'Updated note' });
  });

  it('syncs clean editor content when the current note changes externally', () => {
    render();
    expect(latest.content).toBe('Original');

    mockNoteContent = 'Original\n\nAdded from composer';
    render();

    expect(latest.content).toBe('Original\n\nAdded from composer');
  });

  it('flushes pending auto-save content when unmounted', () => {
    render();

    act(() => latest.handleContentChange('<p>Leaving</p>', 'Leaving'));
    act(() => {
      root.unmount();
      didUnmount = true;
    });

    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', {
      content: 'Leaving',
      name: 'Leaving',
    });
  });
});
