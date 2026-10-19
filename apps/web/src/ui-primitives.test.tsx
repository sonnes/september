import React, { act } from 'react';

import { cn, Slider } from '@september/ui';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function thumbs(): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[role="slider"]')];
}

describe('Slider', () => {
  it('gives the thumb the name of the slider', () => {
    act(() => root.render(<Slider aria-label="Speed" defaultValue={[50]} />));

    expect(thumbs()[0]?.getAttribute('aria-label')).toBe('Speed');
  });

  it('gives the thumb the label that names the slider', () => {
    act(() =>
      root.render(
        <>
          <span id="pitch-label">Pitch</span>
          <Slider aria-labelledby="pitch-label" defaultValue={[50]} />
        </>,
      ),
    );

    expect(thumbs()[0]?.getAttribute('aria-labelledby')).toBe('pitch-label');
  });
});

describe('cn', () => {
  it('keeps the last radius role', () => {
    expect(cn('rounded-control', 'rounded-full')).toBe('rounded-full');
    expect(cn('rounded-full', 'rounded-surface')).toBe('rounded-surface');
  });

  it('keeps the last text role', () => {
    expect(cn('text-sm', 'text-title')).toBe('text-title');
  });
});
