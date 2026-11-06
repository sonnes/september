import { act, useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApplyAccess } from '@september/app-ui/blocks/access';
import { updateSetup } from '@september/app-ui/services/settings';
import { parseAccess } from '@september/core/rules/access';

import { findButton, press, renderPart } from './render';

let systemDark = false;

beforeEach(() => {
  systemDark = false;
  // jsdom has no matchMedia.
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark') && systemDark,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

const html = () => document.documentElement;
const saveAccess = (access: Record<string, unknown>) => updateSetup({ access: parseAccess(access) });

/** The profile on the page, and a key that takes it off. */
function Leaving() {
  const [shown, setShown] = useState(true);
  return (
    <>
      {shown ? <ApplyAccess /> : null}
      <button onClick={() => setShown(false)}>Leave</button>
    </>
  );
}

describe('the access profile on the page', () => {
  it('shows the light theme before setup', async () => {
    await renderPart(<ApplyAccess />);
    expect(html().classList.contains('dark')).toBe(false);
    expect(html().dataset.input).toBe('touch');
  });

  it('shows the dark theme when the person chose it', async () => {
    await saveAccess({ theme: 'dark' });
    await renderPart(<ApplyAccess />);
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('follows the system when the person chose that', async () => {
    systemDark = true;
    await saveAccess({ theme: 'system' });
    await renderPart(<ApplyAccess />);
    expect(html().classList.contains('dark')).toBe(true);
  });

  it('changes as soon as Settings saves a new profile', async () => {
    await renderPart(<ApplyAccess />);
    await act(() => saveAccess({ theme: 'dark', input: 'eyes' }));
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().dataset.input).toBe('eyes');
  });

  it('takes the profile off the page when it leaves, so the landing page shows the light theme', async () => {
    await saveAccess({ theme: 'dark', input: 'eyes', motion: 'reduced', contrast: 'high' });
    const { container } = await renderPart(<Leaving />);
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().style.getPropertyValue('--reach-target')).not.toBe('');

    await press(await findButton('Leave', container));
    expect(html().classList.contains('dark')).toBe(false);
    expect(html().dataset.input).toBeUndefined();
    expect(html().dataset.motion).toBeUndefined();
    expect(html().dataset.contrast).toBeUndefined();
    for (const token of ['--reach-target', '--reach-gap', '--reach-word', '--reach-scale']) {
      expect(html().style.getPropertyValue(token)).toBe('');
    }
  });

  it('reduces motion for the person who asked', async () => {
    await saveAccess({ motion: 'reduced' });
    await renderPart(<ApplyAccess />);
    expect(html().dataset.motion).toBe('reduced');
  });
});

describe('the profile of setup', () => {
  it('shows the profile that setup passes, not the saved one', async () => {
    await saveAccess({ theme: 'light' });
    await renderPart(<ApplyAccess profile={{ ...parseAccess({}), theme: 'dark', input: 'switch' }} />);
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().dataset.input).toBe('switch');
  });
});
