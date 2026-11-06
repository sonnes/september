import { describe, expect, it, vi } from 'vitest';


import { platform, rows } from './platform';
import { addSpace, findButton, finishSetup, PanelWindow, press, renderApp } from './render';

async function openNote(shell?: typeof PanelWindow) {
  await finishSetup();
  addSpace('Family', { context: 'Home' });
  rows.notes.set('note', {
    id: 'note',
    space_id: 'family',
    name: 'Questions',
    content: 'Can we try a smaller dose?',
    created_at: 1,
    updated_at: 1,
  });
  await renderApp('/spaces/family/notes/questions', shell ? { shell } : {});
}

const stage = () => document.querySelector('[role="dialog"][aria-modal="true"]');

describe('Present', () => {
  it('fills the screen while the panel presents a note', async () => {
    const fullScreen = vi.fn(async (_on: boolean) => undefined);
    platform.device.fullScreen = fullScreen;
    await openNote(PanelWindow);

    await press(await findButton('Present this note'));

    expect(stage()?.textContent).toContain('Can we try a smaller dose?');
    expect(fullScreen).toHaveBeenLastCalledWith(true);

    await press(await findButton('Close the presentation'));

    expect(stage()).toBeNull();
    expect(fullScreen).toHaveBeenLastCalledWith(false);
  });

  it('opens the overlay in the web app', async () => {
    await openNote();

    await press(await findButton('Present this note'));

    expect(stage()?.getAttribute('aria-label')).toBe('Presenting Questions');
  });
});
