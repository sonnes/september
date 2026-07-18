// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Note } from '../types';
import { NoteTabs } from './note-tabs';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function note(id: string, name: string): Note {
  return {
    id,
    space_id: 'space-1',
    name,
    content: '',
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };
}

const notes = [note('n1', 'Fractions'), note('n2', 'Questions'), note('n3', 'Reading list')];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(props: Partial<React.ComponentProps<typeof NoteTabs>> = {}) {
  const merged = {
    notes,
    selectedId: 'n1',
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    ...props,
  };
  act(() => root.render(<NoteTabs {...merged} />));
  return merged;
}

function tabByText(text: string) {
  return [...container.querySelectorAll('button')].find(b =>
    (b.textContent ?? '').includes(text)
  );
}

describe('NoteTabs', () => {
  it('renders one tab per note with the selected one marked current', () => {
    render();
    expect(tabByText('Fractions')?.getAttribute('aria-current')).toBe('true');
    expect(tabByText('Questions')?.getAttribute('aria-current')).toBeNull();
  });

  it('calls onSelect with the note when a tab is clicked', () => {
    const { onSelect } = render();
    act(() => tabByText('Questions')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith(notes[1]);
  });

  it('calls onCreate when New note is clicked', () => {
    const { onCreate } = render();
    act(() => tabByText('New note')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onCreate).toHaveBeenCalled();
  });

  it('collapses to an overflow list of all notes when the row does not fit', () => {
    const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 900 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 100 });
    try {
      render();
      const more = container.querySelector<HTMLButtonElement>('button[aria-label="All notes"]');
      expect(more).toBeTruthy();
      act(() => more!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      const list = container.querySelector('[role="menu"], [role="listbox"]');
      expect(list?.textContent).toContain('Fractions');
      expect(list?.textContent).toContain('Questions');
      expect(list?.textContent).toContain('Reading list');
    } finally {
      if (scroll) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scroll);
      if (client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', client);
    }
  });
});
