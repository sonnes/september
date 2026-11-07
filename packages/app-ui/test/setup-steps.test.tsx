import { describe, expect, it, vi } from 'vitest';

import { loadSettings } from '@september/app-ui/services/settings';
import { SPEAKING_STYLES, stepFor } from '@september/core/rules/onboarding';

import { platform } from './platform';
import { findButton, press, renderApp, typeInto } from './render';

const choice = (group: string, name: string) =>
  vi.waitFor(() => {
    const found = [
      ...document.querySelectorAll<HTMLElement>(`[role="radiogroup"][aria-label="${group}"] [role="radio"]`),
    ].find(one => one.closest('label')?.textContent?.includes(name));
    if (!found) throw new Error(`No ${name} in ${group}`);
    return found;
  });

const checked = async (group: string, name: string) => (await choice(group, name)).getAttribute('aria-checked');

/** Opens setup at the How you choose step, for a device that knows the name Meera. */
async function openSetup() {
  vi.mocked(platform.device.identity).mockResolvedValue({ name: 'Meera', userId: null });
  await loadSettings();
  const rendered = await renderApp('/choose');
  const path = () => rendered.router!.state.location.pathname;
  return { ...rendered, path };
}

/** The field that a label with exactly this text names. */
function labelled(container: HTMLElement, text: string): HTMLTextAreaElement {
  const label = [...container.querySelectorAll('label')].find(one => one.textContent === text);
  const field = label && (document.getElementById(label.htmlFor) as HTMLTextAreaElement | null);
  if (!field) throw new Error(`No field labelled ${text}`);
  return field;
}

describe('the About you step of setup', () => {
  it('keeps the speaking style editable, and a style button fills it in', async () => {
    const { container, path } = await openSetup();
    await press(await findButton(stepFor('/choose').action, container));
    await vi.waitFor(() => expect(path()).toBe('/profile'));

    const field = labelled(container, 'Speaking style');
    expect(field.value).toBe(SPEAKING_STYLES[0].value);

    await press(await findButton(SPEAKING_STYLES[1].label, container));
    expect(field.value).toBe(SPEAKING_STYLES[1].value);
    expect(container.textContent).toContain(SPEAKING_STYLES[1].description);

    await typeInto(field, 'Short and dry.');
    await press(await findButton(stepFor('/profile').action, container));
    await vi.waitFor(() => expect(path()).toBe('/connect'));
    await press(await findButton(stepFor('/connect').action, container));
    await vi.waitFor(() => expect(path()).toBe('/finish'));
    await press(await findButton(stepFor('/finish').action, container));

    await vi.waitFor(() =>
      expect(platform.store.putSetting).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ speakingStyle: 'Short and dry.' }),
      ),
    );
  });
});

describe('the Connect step of setup', () => {
  it('keeps the chosen voice when a service connects or disconnects later', async () => {
    vi.mocked(platform.providers.status).mockResolvedValue([
      { provider: 'openrouter', connected: true, label: 'Connected', detail: null },
      { provider: 'elevenlabs', connected: true, label: 'Connected', detail: null },
    ]);
    const { container, path } = await openSetup();
    for (const step of ['/choose', '/profile'] as const) {
      await press(await findButton(stepFor(step).action, container));
    }
    await vi.waitFor(() => expect(path()).toBe('/connect'));
    await vi.waitFor(async () => expect(await checked('Voice', 'ElevenLabs')).toBe('true'));

    await press(await choice('Voice', 'System'));
    expect(await checked('Voice', 'System')).toBe('true');

    const aiGroup = container.querySelector('[role="radiogroup"][aria-label="AI Assistance"]')!;
    await press(await findButton('Disconnect', aiGroup));
    await vi.waitFor(() => expect(aiGroup.textContent).not.toContain('Disconnect'));

    expect(await checked('Voice', 'System')).toBe('true');
  });
});
