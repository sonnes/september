import { describe, expect, it, vi } from 'vitest';

import { stepFor } from '@september/core/rules/onboarding';

import { findButton, press, renderApp } from './render';

const steps = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('nav[aria-label="Onboarding progress"] li > :first-child'),
];

const choice = (container: HTMLElement, group: string, name: string) =>
  vi.waitFor(() => {
    const found = [
      ...container.querySelectorAll<HTMLElement>(`[role="radiogroup"][aria-label="${group}"] [role="radio"]`),
    ].find(one => one.textContent?.includes(name));
    if (!found) throw new Error(`No ${name} in ${group}`);
    return found;
  });

describe('the setup sidebar', () => {
  it('names the brand mark September', async () => {
    const { container } = await renderApp('/welcome');
    expect(container.querySelector('aside img[alt="September"]')).not.toBeNull();
    expect(container.querySelector('aside div[aria-label]')).toBeNull();
  });

  it('names each step by the words it shows', async () => {
    const { container } = await renderApp('/welcome');
    expect(steps(container).length).toBeGreaterThan(1);
    for (const step of steps(container)) {
      expect(step.getAttribute('aria-label')).toBeNull();
      expect(step.textContent?.trim().length).toBeGreaterThan(1);
    }
    expect(steps(container)[0].textContent).toContain('Welcome');
  });

  it('marks the step the person is on as the current step', async () => {
    const { container } = await renderApp('/choose');
    expect(steps(container).map(step => step.getAttribute('aria-current'))).toEqual(
      steps(container).map((_, index) => (index === 1 ? 'step' : null)),
    );
  });
});

describe('the access profile during setup', () => {
  it('shows the profile that the person confirmed in setup', async () => {
    const { container } = await renderApp('/choose');
    const html = document.documentElement;

    await press(await choice(container, 'Theme', 'Dark'));
    await press(await choice(container, 'Input method', 'Eyes'));
    expect(html.classList.contains('dark')).toBe(false);
    expect(html.dataset.input).toBe('touch');

    await press(await findButton(stepFor('/choose').action, container));
    await vi.waitFor(() => expect(html.classList.contains('dark')).toBe(true));
    expect(html.dataset.input).toBe('eyes');
  });
});
