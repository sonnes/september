import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TalkScreen } from '@september/app-ui/pages/talk';

const state = vi.hoisted(() => ({
  saved: vi.fn(async (_id: string, _words: string) => undefined),
  sent: undefined as (() => void) | undefined,
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => {} }));
vi.mock('@platform/services/os', () => ({
  readTalkDraft: async () => 'hello ', saveTalkDraft: state.saved, guardUnsavedChanges: () => () => {},
}));
vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({ data: [{ id: 'space', title: 'Family', context: '' }], isPending: false }),
  useMessages: () => ({ data: [] }), usePhrases: () => ({ data: [] }),
  usePutPhrase: () => ({ mutate: () => {} }),
  useSendMessage: () => ({ mutate: (_text: string, callbacks: { onSuccess: () => void }) => { state.sent = callbacks.onSuccess; }, isPending: false }),
}));
vi.mock('@platform/services/phrase-sync', () => ({ useSyncPhrases: () => {} }));
vi.mock('@platform/services/usage', () => ({ recordMessageUsage: async () => {} }));
vi.mock('@platform/services/speech', () => ({ speak: async () => true, stopSpeaking: () => {}, useSpeaking: () => null, useVoiceFallback: () => null }));
vi.mock('@september/app-ui/blocks/screen', () => ({ ScreenHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>, RightPanel: () => null }));
vi.mock('@september/app-ui/blocks/space-panel', () => ({ PanelRail: () => null }));
vi.mock('@september/app-ui/blocks/space', () => ({
  Composer: ({ draft, onDraft, onAction }: { draft: string; onDraft: (text: string) => void; onAction: (text: string) => void }) => <><textarea aria-label="Draft" value={draft} onChange={event => onDraft(event.target.value)} /><button onClick={() => onAction(draft.trim())}>Speak</button></>,
  Problem: () => null, SpaceDock: () => null, SpaceTitle: () => null, spaceParams: () => ({}), useRememberMode: () => {},
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => { act(() => root.unmount()); root = createRoot(container); state.saved.mockClear(); });
async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['talk-draft', 'space'], 'hello ');
  await act(async () => root.render(<QueryClientProvider client={client}><TalkScreen slug="family" /></QueryClientProvider>));
}

describe('unfinished Talk words', () => {
  it('restores the draft and clears it after sending, including trailing spaces', async () => {
    await render();
    expect(container.querySelector('textarea')?.value).toBe('hello ');
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Speak')!.click());
    await act(async () => state.sent!());
    expect(container.querySelector('textarea')?.value).toBe('');
    expect(state.saved).toHaveBeenCalledWith('space', '');
  });
  it('does not erase words typed while a message is being saved', async () => {
    await render();
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Speak')!.click());
    await act(async () => {
      const field = container.querySelector('textarea')!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'next thought');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => state.sent!());
    expect(container.querySelector('textarea')?.value).toBe('next thought');
    expect(state.saved).not.toHaveBeenCalledWith('space', '');
  });
});
