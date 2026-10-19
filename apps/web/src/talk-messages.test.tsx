import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { TalkScreen } from '@september/app-ui/pages/talk';
import { axeViolations } from './axe';

const state = vi.hoisted(() => ({
  speaking: null as string | null,
  messages: [] as { id: string; type: string; text: string; created_at: string }[],
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => {} }));
vi.mock('@platform/services/os', () => ({
  readTalkDraft: async () => '', saveTalkDraft: async () => undefined, guardUnsavedChanges: () => () => {},
  readTalkMood: async () => null, saveTalkMood: async () => undefined,
}));
vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({ data: [{ id: 'space', title: 'Family', context: 'Home' }], isPending: false }),
  useMessages: () => ({ data: state.messages }), usePhrases: () => ({ data: [] }),
  usePutPhrase: () => ({ mutate: () => {} }),
  useSendMessage: () => ({ mutate: () => {}, isPending: false }),
}));
vi.mock('@platform/services/phrase-sync', () => ({ useSyncPhrases: () => {} }));
vi.mock('@platform/services/usage', () => ({ recordMessageUsage: async () => {} }));
vi.mock('@platform/services/speech', () => ({
  speak: async () => true, stopSpeaking: () => {}, useSpeaking: () => state.speaking, useVoiceFallback: () => null,
  useSpokenWord: () => null,
}));
vi.mock('@september/app-ui/blocks/screen', () => ({ ScreenHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>, RightPanel: () => null }));
vi.mock('@september/app-ui/blocks/space-panel', () => ({ PanelRail: () => null }));
vi.mock('@september/app-ui/blocks/space', () => ({
  Composer: ({ fieldRef, onAction }: { fieldRef?: React.Ref<HTMLTextAreaElement>; onAction: (text: string) => void }) =>
    <><textarea ref={fieldRef} aria-label="Message" /><button onClick={() => onAction('Good morning')}>Speak</button></>,
  Problem: () => null, SpaceDock: () => null, SpaceTitle: () => null, spaceParams: () => ({}), useRememberMode: () => {},
  useSpaceBySlug: () => ({ space: { id: 'space', title: 'Family', context: 'Home' }, spaces: [], isPending: false }),
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  state.speaking = null;
  state.messages = [];
});

const client = () => {
  const one = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  one.setQueryData(['talk-draft', 'space'], '');
  one.setQueryData(['talk-mood', 'space'], null);
  return one;
};

async function render(queries = client()) {
  await act(async () => root.render(<QueryClientProvider client={queries}><TalkScreen slug="family" /></QueryClientProvider>));
  return queries;
}

it('names a past message by its words and by what a press does', async () => {
  state.messages = [{ id: 'one', type: 'user', text: 'Could you open the window?', created_at: new Date().toISOString() }];
  await render();

  const row = [...container.querySelectorAll('button')].find(one => one.textContent?.includes('open the window'));
  expect(row?.hasAttribute('aria-label')).toBe(false);
  expect(row?.textContent).toMatch(/^Speak again: Could you open the window\?/);
});

it('announces the sentence that plays through a status that is already there', async () => {
  const queries = await render();
  const status = container.querySelector('[role="status"]');
  expect(status?.textContent).toBe('');

  await act(async () => [...container.querySelectorAll('button')].find(one => one.textContent === 'Speak')!.click());
  state.speaking = 'composer';
  await render(queries);

  expect(container.querySelector('[role="status"]')).toBe(status);
  expect(status?.textContent).toBe('Speaking: Good morning');
});

async function speakGoodMorning() {
  const queries = await render();
  await act(async () => [...container.querySelectorAll('button')].find(one => one.textContent === 'Speak')!.click());
  state.speaking = 'composer';
  await render(queries);
}

const follows = (later: Element | null, earlier: Element | null) =>
  Boolean(earlier && later && earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

it('shows the sentence that plays below the messages and above the field', async () => {
  state.messages = [{ id: 'one', type: 'user', text: 'Could you open the window?', created_at: new Date().toISOString() }];
  await speakGoodMorning();

  const card = container.querySelector('[role="region"][aria-label="Speaking"]');
  expect(card?.textContent).toContain('Good morning');
  expect(follows(card, container.querySelector('[aria-label="Messages"]'))).toBe(true);
  expect(follows(container.querySelector('textarea[aria-label="Message"]'), card)).toBe(true);
});

it('moves to the field on Write next while the sentence plays on', async () => {
  await speakGoodMorning();

  await act(async () => [...container.querySelectorAll('button')].find(one => one.textContent === 'Write next')!.click());

  expect(document.activeElement).toBe(container.querySelector('textarea[aria-label="Message"]'));
  expect(container.querySelector('[role="region"][aria-label="Speaking"]')).not.toBeNull();
});

it('passes the axe rules that jsdom can run', async () => {
  await render();
  expect(await axeViolations(container)).toEqual([]);
});
