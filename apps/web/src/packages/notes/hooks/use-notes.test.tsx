// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotes } from './use-notes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mockEq, mockIsUndefined, mockNot, whereFns } = vi.hoisted(() => ({
  mockEq: vi.fn((left: unknown, right: unknown) => ({ op: 'eq', left, right })),
  mockIsUndefined: vi.fn((value: unknown) => ({ op: 'isUndefined', value })),
  mockNot: vi.fn((value: unknown) => ({ op: 'not', value })),
  whereFns: [] as Array<(refs: { items: { space_id: string; name: string } }) => unknown>,
}));

vi.mock('@tanstack/db', () => ({
  eq: (...args: unknown[]) => mockEq(...args),
  ilike: (left: unknown, right: unknown) => ({ op: 'ilike', left, right }),
  isUndefined: (...args: unknown[]) => mockIsUndefined(...args),
  not: (...args: unknown[]) => mockNot(...args),
}));

vi.mock('@tanstack/react-db', () => ({
  useLiveQuery: (build: (q: { from: () => unknown }) => unknown) => {
    const query = {
      where: (fn: (refs: { items: { space_id: string; name: string } }) => unknown) => {
        whereFns.push(fn);
        return query;
      },
      orderBy: () => query,
    };
    build({ from: () => query });
    return { data: [], isLoading: false, isError: false, status: 'success' };
  },
}));

vi.mock('../db', () => ({ noteCollection: {} }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  whereFns.length = 0;
  mockEq.mockClear();
  mockIsUndefined.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Harness({ spaceId }: { spaceId?: string }) {
  useNotes({ spaceId });
  return null;
}

function NotesHarness() {
  useNotes({ scope: 'space-notes' });
  return null;
}

function render(spaceId?: string, scope?: 'space-notes') {
  act(() => root.render(scope ? <NotesHarness /> : <Harness spaceId={spaceId} />));
}

describe('useNotes', () => {
  it('defaults to global notes without a space', () => {
    render();

    expect(whereFns[0]({ items: { space_id: 'space-ref', name: 'name-ref' } })).toEqual({
      op: 'isUndefined',
      value: 'space-ref',
    });
  });

  it('filters to a space when spaceId is provided', () => {
    render('space-1');

    expect(whereFns[0]({ items: { space_id: 'space-ref', name: 'name-ref' } })).toEqual({
      op: 'eq',
      left: 'space-ref',
      right: 'space-1',
    });
  });

  it('filters to notes across all spaces', () => {
    render(undefined, 'space-notes');

    expect(whereFns[0]({ items: { space_id: 'space-ref', name: 'name-ref' } })).toEqual({
      op: 'not',
      value: {
        op: 'isUndefined',
        value: 'space-ref',
      },
    });
  });
});
