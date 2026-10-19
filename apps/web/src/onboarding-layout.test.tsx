// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingLayout, useDraft } from '@september/app-ui/layouts/onboarding';
import { axeViolations } from './axe';

const outlet = vi.hoisted(() => ({ step: null as null | (() => React.ReactNode) }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, disabled, children, ...rest }: { to: string; disabled?: boolean; children: React.ReactNode }) => (
    <a href={disabled ? undefined : to} aria-disabled={disabled || undefined} {...rest}>
      {children}
    </a>
  ),
  Navigate: () => null,
  Outlet: () => (outlet.step ? outlet.step() : <p>The step</p>),
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: '/welcome' } }),
}));
vi.mock('@platform/services/os', () => ({
  osName: '',
  currentSetup: () => null,
  subscribeSetup: () => () => {},
}));
vi.mock('@platform/services/speech', () => ({ useSpeaking: () => null }));
vi.mock('@september/app-ui/pages/help', () => ({ HelpGuideContent: () => null }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<OnboardingLayout />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  outlet.step = null;
});

const steps = () => [...container.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Onboarding progress"] a')];

describe('the setup sidebar', () => {
  it('names the brand mark September', () => {
    expect(container.querySelector('aside img[alt="September"]')).not.toBeNull();
    expect(container.querySelector('aside div[aria-label]')).toBeNull();
  });

  it('names each step by the words it shows', () => {
    expect(steps().length).toBeGreaterThan(1);
    for (const step of steps()) {
      expect(step.getAttribute('aria-label')).toBeNull();
      expect(step.textContent?.trim().length).toBeGreaterThan(1);
    }
    expect(steps()[0].textContent).toContain('Welcome');
  });

  it('marks the step the user is on as the current step', () => {
    expect(steps().map((step) => step.getAttribute('aria-current'))).toEqual(
      steps().map((_, index) => (index === 0 ? 'step' : null)),
    );
  });
});

describe('the access profile during setup', () => {
  it('shows the profile that the person confirmed in setup', () => {
    function Confirm() {
      const { draft, setDraft } = useDraft();
      return (
        <button onClick={() => setDraft((current) => ({ ...current, access: { ...draft.access, theme: 'dark', input: 'eyes' } }))}>
          Continue
        </button>
      );
    }
    outlet.step = () => <Confirm />;
    act(() => root.render(<OnboardingLayout key="again" />));
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    act(() => [...container.querySelectorAll('button')].find((one) => one.textContent === 'Continue')!.click());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.input).toBe('eyes');
  });
});

it('passes the axe rules that jsdom can run', async () => {
  expect(await axeViolations(container)).toEqual([]);
});
