// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingLayout } from '@september/app-ui/layouts/onboarding';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, disabled, children, ...rest }: { to: string; disabled?: boolean; children: React.ReactNode }) => (
    <a href={disabled ? undefined : to} aria-disabled={disabled || undefined} {...rest}>
      {children}
    </a>
  ),
  Navigate: () => null,
  Outlet: () => <p>The step</p>,
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: '/welcome' } }),
}));
vi.mock('@platform/services/os', () => ({ osName: '' }));
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
