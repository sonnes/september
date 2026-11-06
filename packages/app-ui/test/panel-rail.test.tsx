import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InputLayer } from '@september/app-ui/blocks/input-layer';
import { PanelRail } from '@september/app-ui/blocks/space-panel';
import { DEFAULT_ACCESS } from '@september/core/rules/access';

import { rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, renderPart } from './render';

beforeEach(async () => {
  await finishSetup();
  addSpace('Family');
  rows.phrases.set('p1', {
    id: 'p1',
    space_id: 'family',
    text: 'Thank you',
    kind: 'phrase',
    pinned: true,
    created_at: 1,
    updated_at: 1,
  });
});

async function renderTalk() {
  await renderApp('/spaces/family/talk');
  await vi.waitFor(() => expect(document.querySelector('textarea')).not.toBeNull());
}

const railKeys = () => [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Panel rail"] button')];

it('names each rail key by the label it shows', async () => {
  await renderTalk();

  expect(railKeys().map(key => [key.hasAttribute('aria-label'), key.textContent])).toEqual([
    [false, 'Phrases'],
    [false, 'Voice'],
  ]);
});

it('opens the card of a rail key and marks the key as pressed', async () => {
  await renderTalk();

  await press(railKeys()[1]);

  await vi.waitFor(() => expect(railKeys()[1].getAttribute('aria-pressed')).toBe('true'));
  expect(railKeys()[0].getAttribute('aria-pressed')).toBe('false');
  expect(document.querySelector('aside[aria-label="Voice panel"]')).not.toBeNull();
});

it('scans the rail as one group', async () => {
  await renderPart(
    <>
      <InputLayer profile={{ ...DEFAULT_ACCESS, input: 'switch' }} />
      <PanelRail spaceId="family" />
    </>,
  );

  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  });
  expect(document.querySelector('[data-scan="group"]')?.getAttribute('aria-label')).toBe('Panel rail');
});

describe('on a phone', () => {
  const wide = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: wide });
  });

  const header = () => document.querySelector<HTMLElement>('main header')!;
  const headerKey = (name: string) =>
    [...header().querySelectorAll<HTMLButtonElement>('button')].find(key => key.textContent === name);

  it('puts the rail keys in the screen header', async () => {
    await renderTalk();

    await vi.waitFor(() => expect(headerKey('Phrases')).toBeDefined());
    expect(headerKey('Voice')).toBeDefined();
    expect(document.querySelector('nav[aria-label="Panel rail"]')).toBeNull();
  });

  it('opens a key as a sheet over the screen, and gives the focus back on close', async () => {
    await renderTalk();
    await vi.waitFor(() => expect(headerKey('Phrases')).toBeDefined());

    act(() => headerKey('Phrases')!.focus());
    await press(headerKey('Phrases')!);

    const sheet = await vi.waitFor(() => {
      const found = document.querySelector('[role="dialog"]');
      if (!found) throw new Error('No sheet');
      return found;
    });
    await findButton('Thank you', sheet);
    expect(headerKey('Phrases')!.getAttribute('aria-pressed')).toBe('true');

    await press(await findButton('Close', sheet));
    await vi.waitFor(() => {
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(headerKey('Phrases'));
    });
  });
});
