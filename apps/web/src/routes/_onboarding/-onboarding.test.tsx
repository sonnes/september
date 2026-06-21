// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.hoisted(() => vi.fn());
const mockUseAccount = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/packages/account', () => ({
  useAccount: mockUseAccount,
}));

vi.mock('@/packages/onboarding', () => ({
  OnboardingFlow: () => <div>Onboarding flow</div>,
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/packages/speech', () => ({
  SpeechProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { OnboardingPage } from './onboarding';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockNavigate.mockReset();
  mockUseAccount.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

describe('OnboardingPage', () => {
  it('redirects to talk when onboarding is complete', () => {
    mockUseAccount.mockReturnValue({
      account: { onboarding_completed: true },
      loading: false,
    });

    render(<OnboardingPage />);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/talk', replace: true });
    expect(container.textContent).not.toContain('Onboarding flow');
  });

  it('renders onboarding when onboarding is incomplete', () => {
    mockUseAccount.mockReturnValue({
      account: { onboarding_completed: false },
      loading: false,
    });

    render(<OnboardingPage />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Onboarding flow');
  });
});
