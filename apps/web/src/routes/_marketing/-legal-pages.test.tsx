// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Route as PrivacyRoute } from './privacy-policy';
import { Route as TermsRoute } from './terms-of-service';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@tanstack/react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({
      children,
      to,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

type TestRoute = {
  component: React.ComponentType;
};

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

function renderRoute(route: TestRoute) {
  const Page = route.component;
  act(() => root.render(<Page />));
}

describe('legal marketing pages', () => {
  it.each([
    ['Privacy Policy', PrivacyRoute],
    ['Terms of Service', TermsRoute],
  ])('uses the shared legal shell for %s', (_title, route) => {
    renderRoute(route as TestRoute);

    expect(container.firstElementChild?.className).toBe(
      'mx-auto w-full max-w-3xl px-4 py-12 sm:px-6'
    );
    expect(container.querySelector('header')?.className).toBe('mb-10 space-y-2');
    expect(container.querySelector('article')?.className).toContain('space-y-8 text-sm');
  });

  it.each([
    ['privacy policy', PrivacyRoute],
    ['terms of service', TermsRoute],
  ])('opens %s with a compact summary callout list', (_title, route) => {
    renderRoute(route as TestRoute);

    const summary = container.querySelector('[data-slot="callout-description"]');
    const list = summary?.firstElementChild;

    expect(list?.tagName).toBe('UL');
    expect(list?.className).toContain('mt-1 list-disc space-y-1 pl-5');
    expect(summary?.querySelector('.grid')).toBeNull();
  });
});
