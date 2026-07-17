// @vitest-environment jsdom
import { act } from 'react';

import { FileText, MessagesSquare } from 'lucide-react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModeGroup } from './mode-group';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MODES = [
  { key: 'talk' as const, label: 'Talk', icon: MessagesSquare },
  { key: 'notes' as const, label: 'Notes', icon: FileText },
];

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

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

function tabs() {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
}

function key(el: Element, k: string) {
  act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })));
}

describe('ModeGroup', () => {
  it('marks the active mode with aria-selected and roving tabindex', () => {
    render(<ModeGroup modes={MODES} value="talk" onChange={() => {}} />);
    const [talk, notes] = tabs();
    expect(talk.getAttribute('aria-selected')).toBe('true');
    expect(notes.getAttribute('aria-selected')).toBe('false');
    expect(talk.tabIndex).toBe(0);
    expect(notes.tabIndex).toBe(-1);
  });

  it('moves focus with arrow keys without changing selection', () => {
    const onChange = vi.fn();
    render(<ModeGroup modes={MODES} value="talk" onChange={onChange} />);
    const [talk, notes] = tabs();
    act(() => talk.focus());
    key(talk, 'ArrowRight');
    expect(document.activeElement).toBe(notes);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('wraps focus around the ends', () => {
    render(<ModeGroup modes={MODES} value="talk" onChange={() => {}} />);
    const [talk, notes] = tabs();
    act(() => talk.focus());
    key(talk, 'ArrowLeft');
    expect(document.activeElement).toBe(notes);
  });

  it('activates the focused mode on Enter', () => {
    const onChange = vi.fn();
    render(<ModeGroup modes={MODES} value="talk" onChange={onChange} />);
    const [, notes] = tabs();
    act(() => notes.focus());
    key(notes, 'Enter');
    expect(onChange).toHaveBeenCalledWith('notes');
  });

  it('activates on click', () => {
    const onChange = vi.fn();
    render(<ModeGroup modes={MODES} value="talk" onChange={onChange} />);
    const [, notes] = tabs();
    act(() => notes.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith('notes');
  });
});
