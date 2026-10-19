// @vitest-environment jsdom
import { act, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_DRAFT, stepFor, type OnboardingDraft } from './rules/onboarding';

const state = vi.hoisted(() => ({
  setup: { access: undefined as unknown },
  update: vi.fn(),
  saveSetup: vi.fn(),
  navigate: vi.fn(),
  draft: null as unknown,
  drafts: new Set<() => void>(),
}));

vi.mock('@platform/services/os', async (original) => ({
  ...(await original<typeof import('./services/os')>()),
  currentSetup: () => state.setup,
  subscribeSetup: () => () => {},
  updateSetup: (patch: { access: unknown }) => {
    state.update(patch);
    state.setup = { ...state.setup, ...patch };
    return Promise.resolve(state.setup);
  },
  saveSetup: (draft: unknown) => {
    state.saveSetup(draft);
    return Promise.resolve(draft);
  },
}));
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  useNavigate: () => state.navigate,
}));
// The draft of setup, shared by the steps as the onboarding layout shares it.
vi.mock('@september/app-ui/layouts/onboarding', () => ({
  useDraft: () => {
    const draft = useSyncExternalStore(
      (listener) => {
        state.drafts.add(listener);
        return () => state.drafts.delete(listener);
      },
      () => state.draft as OnboardingDraft,
    );
    const setDraft = (next: (current: OnboardingDraft) => OnboardingDraft) => {
      state.draft = next(state.draft as OnboardingDraft);
      state.drafts.forEach((listener) => listener());
    };
    return { draft, setDraft };
  },
}));

import { AccessSettings } from '@september/app-ui/pages/settings';
import { ChooseStep, FinishStep } from '@september/app-ui/pages/steps';
import { axeViolations } from './axe';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  state.setup = { access: undefined };
  state.update.mockReset();
  state.saveSetup.mockReset();
  state.navigate.mockReset();
  state.draft = { ...DEFAULT_DRAFT, name: 'Meera' };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<AccessSettings />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const choice = (group: string, name: string) => {
  const radios = container.querySelector(`[role="radiogroup"][aria-label="${group}"]`);
  expect(radios).not.toBeNull();
  return [...radios!.querySelectorAll<HTMLElement>('[role="radio"]')].find((one) =>
    one.textContent?.includes(name),
  )!;
};

const lastAccess = () => state.update.mock.calls.at(-1)?.[0].access;
const button = (name: string) =>
  [...container.querySelectorAll('button')].find(
    (one) => one.textContent?.trim() === name || one.getAttribute('aria-label') === name,
  )!;
const render = async (setup: { access?: unknown } = { access: undefined }) => {
  state.setup = setup as { access: unknown };
  await act(async () => root.render(<></>));
  await act(async () => root.render(<AccessSettings />));
};

describe('the Access section of Settings', () => {
  it('shows touch and the light theme before the person chooses', () => {
    expect(choice('Input method', 'Touch').getAttribute('aria-checked')).toBe('true');
    expect(choice('Theme', 'Light').getAttribute('aria-checked')).toBe('true');
  });

  it('saves a new input method only when the person confirms it', async () => {
    await act(async () => choice('Input method', 'Eyes').click());
    expect(choice('Input method', 'Eyes').getAttribute('aria-checked')).toBe('true');
    expect(state.update).not.toHaveBeenCalled();

    await act(async () => button('Use Eyes').click());
    expect(lastAccess()).toMatchObject({ input: 'eyes' });
  });

  it('does not change the input method while the arrow keys move through it', async () => {
    const touch = choice('Input method', 'Touch');
    await act(async () => {
      touch.focus();
      touch.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(choice('Input method', 'Mouse').getAttribute('aria-checked')).toBe('true');
    expect(state.update).not.toHaveBeenCalled();
  });

  it('saves the theme the person chooses', async () => {
    await act(async () => choice('Theme', 'Dark').click());
    expect(lastAccess()).toMatchObject({ theme: 'dark' });
  });

  it('saves the click sound the person chooses', async () => {
    await act(async () => choice('Click sound', 'Off').click());
    expect(lastAccess()).toMatchObject({ sound: 'off' });
  });

  it('offers the dwell time only for eye gaze', async () => {
    expect(container.textContent).not.toContain('Dwell time');
    await act(async () => choice('Input method', 'Eyes').click());
    expect(container.textContent).toContain('Dwell time');
    await act(async () => button('Use Eyes').click());

    await act(async () => button('Longer dwell time').click());
    expect(lastAccess()).toMatchObject({ input: 'eyes', dwellMs: 900 });
  });

  it('marks the shortest dwell time, and a press there changes nothing', async () => {
    await render({ access: { input: 'eyes', dwellMs: 300 } });
    expect(button('Shorter dwell time').getAttribute('aria-disabled')).toBe('true');
    expect(button('Longer dwell time').getAttribute('aria-disabled')).toBeNull();
    await act(async () => button('Shorter dwell time').click());
    expect(state.update).not.toHaveBeenCalled();
  });

  it('offers the scan step only for a switch', async () => {
    expect(container.textContent).not.toContain('Scan step');
    await act(async () => choice('Input method', 'Switch').click());
    expect(container.textContent).toContain('Scan step');
  });

  it('shows reduced motion while the input method keeps motion reduced', async () => {
    expect(choice('Motion', 'Full').getAttribute('aria-checked')).toBe('true');
    await render({ access: { input: 'eyes' } });
    expect(choice('Motion', 'Reduced').getAttribute('aria-checked')).toBe('true');
    expect(choice('Motion', 'Full').getAttribute('aria-checked')).toBe('false');
    expect(choice('Motion', 'Full').getAttribute('aria-disabled')).toBe('true');

    await act(async () => choice('Motion', 'Full').click());
    expect(state.update).not.toHaveBeenCalled();
    expect(choice('Motion', 'Reduced').getAttribute('aria-checked')).toBe('true');
  });
});

describe('the How you choose step of setup', () => {
  it('keeps the input method of setup until the person continues', async () => {
    await act(async () => root.render(<ChooseStep />));
    await act(async () => choice('Input method', 'Switch').click());
    expect((state.draft as OnboardingDraft).access.input).toBe('touch');

    await act(async () => button(stepFor('/choose').action).click());
    expect((state.draft as OnboardingDraft).access.input).toBe('switch');
    expect(state.navigate).toHaveBeenCalledWith({ to: '/profile' });
  });

  it('saves the chosen profile with the setup', async () => {
    await act(async () => root.render(<ChooseStep />));
    await act(async () => choice('Input method', 'Switch').click());
    await act(async () => button(stepFor('/choose').action).click());

    await act(async () => root.render(<FinishStep />));
    await act(async () => button(stepFor('/finish').action).click());
    expect(state.saveSetup).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Meera', access: expect.objectContaining({ input: 'switch' }) }),
    );
  });
});

it('passes the axe rules that jsdom can run', async () => {
  await render();
  expect(await axeViolations(container)).toEqual([]);
});
