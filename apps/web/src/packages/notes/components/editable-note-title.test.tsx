// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditableNoteTitle } from './editable-note-title';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUpdateNote = vi.fn();

vi.mock('../mutations', () => ({
  updateNote: (...args: unknown[]) => mockUpdateNote(...args),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockUpdateNote.mockReset();
  mockUpdateNote.mockResolvedValue(undefined);
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

function input() {
  return container.querySelector('input[aria-label="Note title"]') as HTMLInputElement;
}

describe('EditableNoteTitle', () => {
  it('renders a simple input', () => {
    render(<EditableNoteTitle noteId="note-1" name="Care plan" />);

    expect(input().value).toBe('Care plan');
  });

  it('shows placeholder text when title is unset', () => {
    render(<EditableNoteTitle noteId="note-1" name="Untitled note" />);

    expect(input().value).toBe('');
    expect(input().placeholder).toBe('Untitled note');
  });

  it('saves the title on blur', async () => {
    render(<EditableNoteTitle noteId="note-1" />);

    await act(async () => {
      input().value = 'Morning visit';
      input().dispatchEvent(new Event('input', { bubbles: true }));
      input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockUpdateNote).toHaveBeenCalledWith('note-1', { name: 'Morning visit' });
  });
});
