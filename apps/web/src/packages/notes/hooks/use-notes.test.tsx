// @vitest-environment jsdom
import React, { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type UseNotesReturn, useNotes } from './use-notes';

const { useRecordListQuery } = vi.hoisted(() => ({ useRecordListQuery: vi.fn() }));
vi.mock('@/packages/shared/lib/data', () => ({ useRecordListQuery }));
vi.mock('../db', () => ({ noteCollection: {} }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let latest: UseNotesReturn;

function Probe(props: Parameters<typeof useNotes>[0]) {
  latest = useNotes(props);
  return null;
}

beforeEach(() => {
  useRecordListQuery.mockReturnValue({
    data: [
      {
        id: 'global',
        name: 'Global',
        content: '',
        created_at: new Date(1),
        updated_at: new Date(1),
      },
      {
        id: 'space-old',
        space_id: 's1',
        name: 'Alpha',
        content: '',
        created_at: new Date(2),
        updated_at: new Date(2),
      },
      {
        id: 'space-new',
        space_id: 's1',
        name: 'Beta',
        content: '',
        created_at: new Date(3),
        updated_at: new Date(3),
      },
      {
        id: 'other',
        space_id: 's2',
        name: 'Other',
        content: '',
        created_at: new Date(4),
        updated_at: new Date(4),
      },
    ],
    isLoading: false,
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(props: Parameters<typeof useNotes>[0] = {}) {
  act(() => root.render(<Probe {...props} />));
}

describe('useNotes', () => {
  it('defaults to global notes without a space', () => {
    render();
    expect(latest.notes.map(note => note.id)).toEqual(['global']);
  });

  it('filters and orders notes for one space', () => {
    render({ spaceId: 's1' });
    expect(latest.notes.map(note => note.id)).toEqual(['space-new', 'space-old']);
  });

  it('filters to notes across all spaces', () => {
    render({ scope: 'space-notes' });
    expect(latest.notes.map(note => note.id)).toEqual(['other', 'space-new', 'space-old']);
  });

  it('applies case-insensitive name search in memory', () => {
    render({ spaceId: 's1', searchQuery: 'alp' });
    expect(latest.notes.map(note => note.id)).toEqual(['space-old']);
  });
});
