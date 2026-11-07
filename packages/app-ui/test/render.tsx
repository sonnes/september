/**
 * Renders shared screens for a test: the real route tree over a memory
 * history, or one part inside the query cache. The platform is the fake in
 * `./platform`, and a test sets its rows and answers first.
 */

import { act, StrictMode, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRouter,
  type RouteComponent,
} from '@tanstack/react-router';
import { afterEach, vi } from 'vitest';

import { createQueryClient } from '@september/app-ui/app';
import { AppShell } from '@september/app-ui/layouts/app';
import { PanelShell } from '@september/app-ui/layouts/panel';
import { createAppRoutes } from '@september/app-ui/routes';
import { saveSetup } from '@september/app-ui/services/settings';
import { DEFAULT_DRAFT } from '@september/core/rules/onboarding';
import type { Space } from '@september/core/rules/records';

import { rows } from './platform';

const mounted: { root: Root; container: HTMLElement }[] = [];

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

export interface Rendered {
  container: HTMLElement;
  router: AnyRouter | null;
}

async function mount(node: ReactNode, router: AnyRouter | null = null): Promise<Rendered> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  await act(async () => root.render(node));
  return { container, router };
}

/** One part, such as a block, inside the query cache and a router at `/`. */
export function renderPart(node: ReactNode): Promise<Rendered> {
  const rootRoute = createRootRoute({ component: Outlet });
  const page = createRoute({ getParentRoute: () => rootRoute, path: '$', component: () => <>{node}</> });
  const index = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <>{node}</> });
  const router = createRouter({
    routeTree: rootRoute.addChildren([index, page]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return renderRouter(router);
}

/** The panel window of the Mac app, as a shell. */
export function PanelWindow() {
  return <PanelShell onHide={() => {}} />;
}

/**
 * The whole app at `path`, in the shell of the browser app or another shell.
 * `dashboard` draws the page at `/dashboard`, and `strict` runs it in StrictMode.
 */
export function renderApp(
  path: string,
  {
    shell = AppShell,
    dashboard = () => <h1>Today</h1>,
    strict = false,
  }: { shell?: RouteComponent; dashboard?: RouteComponent; strict?: boolean } = {},
): Promise<Rendered> {
  const routeTree = createAppRoutes({
    shell,
    home: { component: () => <p>Home</p> },
    pages: { '/dashboard': dashboard },
  });
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
  return renderRouter(router, strict);
}

async function renderRouter(router: AnyRouter, strict = false): Promise<Rendered> {
  const client = createQueryClient();
  const app = (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  const rendered = await mount(strict ? <StrictMode>{app}</StrictMode> : app, router);
  await act(async () => router.load());
  return rendered;
}

/** A finished setup, so the app pages open instead of the setup steps. */
export async function finishSetup(patch: Partial<typeof DEFAULT_DRAFT> = {}): Promise<void> {
  await saveSetup({ ...DEFAULT_DRAFT, name: 'Ravi', ...patch });
}

/** Puts a space in the store for the person of the finished setup. */
export function addSpace(title: string, extra: Partial<Space> = {}): Space {
  const space: Space = {
    id: title.toLowerCase().replace(/\s+/g, '-'),
    user_id: 'local-user',
    title,
    created_at: 1,
    updated_at: 1,
    ...extra,
  };
  rows.spaces.set(space.id, space);
  return space;
}

const nameOf = (element: Element) =>
  (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Waits for the first button in `scope` whose name holds `name`. */
export function findButton(name: string | RegExp, scope: ParentNode = document): Promise<HTMLButtonElement> {
  return vi.waitFor(() => {
    const found = [...scope.querySelectorAll<HTMLButtonElement>('button, [role="button"]')].find(button =>
      typeof name === 'string' ? nameOf(button).includes(name) : name.test(nameOf(button)),
    );
    if (!found) throw new Error(`No button named ${String(name)}`);
    return found;
  });
}

/** Puts words in a text field as typing does. */
export async function typeInto(field: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
  await act(async () => {
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Answers each media query with `matches`. `vi.restoreAllMocks` puts the jsdom answer back. */
export function mockMedia(matches: (query: string) => boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    query =>
      ({
        matches: matches(query),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

/** Presses a button inside `act`. */
export async function press(button: HTMLElement): Promise<void> {
  await act(async () => button.click());
}
