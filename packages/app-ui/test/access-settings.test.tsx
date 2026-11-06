import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { loadSettings } from '@september/app-ui/services/settings';
import { parseAccess } from '@september/core/rules/access';
import { stepFor, type SavedSetup } from '@september/core/rules/onboarding';
import { SETTINGS } from '@september/core/rules/settings';

import { platform, rows } from './platform';
import { findButton, finishSetup, press, renderApp } from './render';

const choice = (group: string, name: string) =>
  vi.waitFor(() => {
    const found = [
      ...document.querySelectorAll<HTMLElement>(`[role="radiogroup"][aria-label="${group}"] [role="radio"]`),
    ].find(one => one.textContent?.includes(name));
    if (!found) throw new Error(`No ${name} in ${group}`);
    return found;
  });

const checked = async (group: string, name: string) => (await choice(group, name)).getAttribute('aria-checked');
const saved = () => (rows.settings.get(SETTINGS.setup) as SavedSetup | undefined)?.access;

/** The Access section of Settings, for a person with this saved profile. */
async function openAccess(access: Record<string, unknown> = {}) {
  await finishSetup({ access: parseAccess(access) });
  const rendered = await renderApp('/settings/access');
  await choice('Input method', 'Touch');
  return rendered;
}

describe('the Access section of Settings', () => {
  it('shows touch and the light theme before the person chooses', async () => {
    await openAccess();
    expect(await checked('Input method', 'Touch')).toBe('true');
    expect(await checked('Theme', 'Light')).toBe('true');
  });

  it('saves a new input method only when the person confirms it', async () => {
    await openAccess();
    await press(await choice('Input method', 'Eyes'));
    expect(await checked('Input method', 'Eyes')).toBe('true');
    expect(saved()?.input).toBe('touch');

    await press(await findButton('Use Eyes'));
    await vi.waitFor(() => expect(saved()?.input).toBe('eyes'));
  });

  it('does not change the input method while the arrow keys move through it', async () => {
    await openAccess();
    const touch = await choice('Input method', 'Touch');
    await act(async () => {
      touch.focus();
      touch.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    expect(await checked('Input method', 'Mouse')).toBe('true');
    expect(saved()?.input).toBe('touch');
  });

  it('saves the theme the person chooses', async () => {
    await openAccess();
    await press(await choice('Theme', 'Dark'));
    await vi.waitFor(() => expect(saved()?.theme).toBe('dark'));
  });

  it('saves the click sound the person chooses', async () => {
    await openAccess();
    await press(await choice('Click sound', 'Off'));
    await vi.waitFor(() => expect(saved()?.sound).toBe('off'));
  });

  it('offers the dwell time only for eye gaze', async () => {
    const { container } = await openAccess();
    expect(container.textContent).not.toContain('Dwell time');
    await press(await choice('Input method', 'Eyes'));
    expect(container.textContent).toContain('Dwell time');
    await press(await findButton('Use Eyes'));

    await press(await findButton('Longer dwell time'));
    await vi.waitFor(() => expect(saved()).toMatchObject({ input: 'eyes', dwellMs: 900 }));
  });

  it('marks the shortest dwell time, and a press there changes nothing', async () => {
    await openAccess({ input: 'eyes', dwellMs: 300 });
    const shorter = await findButton('Shorter dwell time');
    expect(shorter.getAttribute('aria-disabled')).toBe('true');
    expect((await findButton('Longer dwell time')).getAttribute('aria-disabled')).toBeNull();
    const before = rows.settings.get(SETTINGS.setup);
    await press(shorter);
    expect(rows.settings.get(SETTINGS.setup)).toBe(before);
  });

  it('offers the scan step only for a switch', async () => {
    const { container } = await openAccess();
    expect(container.textContent).not.toContain('Scan step');
    await press(await choice('Input method', 'Switch'));
    expect(container.textContent).toContain('Scan step');
  });

  it('shows reduced motion while the input method keeps motion reduced', async () => {
    await openAccess({ input: 'eyes' });
    expect(await checked('Motion', 'Reduced')).toBe('true');
    expect(await checked('Motion', 'Full')).toBe('false');
    expect((await choice('Motion', 'Full')).getAttribute('aria-disabled')).toBe('true');

    const before = rows.settings.get(SETTINGS.setup);
    await press(await choice('Motion', 'Full'));
    expect(rows.settings.get(SETTINGS.setup)).toBe(before);
    expect(await checked('Motion', 'Reduced')).toBe('true');
  });

  it('shows full motion for touch', async () => {
    await openAccess();
    expect(await checked('Motion', 'Full')).toBe('true');
  });
});

describe('the How you choose step of setup', () => {
  it('saves the chosen profile with the setup', async () => {
    vi.mocked(platform.device.identity).mockResolvedValue({ name: 'Meera', userId: null });
    await loadSettings();
    const { container, router } = await renderApp('/choose');
    const path = () => router!.state.location.pathname;

    await press(await choice('Input method', 'Switch'));
    await press(await findButton(stepFor('/choose').action, container));
    await vi.waitFor(() => expect(path()).toBe('/profile'));
    await press(await findButton(stepFor('/profile').action, container));
    await vi.waitFor(() => expect(path()).toBe('/connect'));
    await press(await findButton(stepFor('/connect').action, container));
    await vi.waitFor(() => expect(path()).toBe('/finish'));
    await press(await findButton(stepFor('/finish').action, container));

    await vi.waitFor(() =>
      expect(rows.settings.get(SETTINGS.setup)).toMatchObject({ name: 'Meera', access: { input: 'switch' } }),
    );
  });
});
