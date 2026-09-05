// @vitest-environment jsdom
import React, { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from '../../pages/home';
import { AGENT_DEMO_ASKS, AgentSection } from './agent-section';
import { LiveDemoSection } from './live-demo-section';
import { NOTE_SENTENCES, NotesSection, PRESENT_CHUNKS } from './notes-section';
import { PhraseCodesSection, matchDemoCode } from './phrase-codes-section';
import { VoiceSection } from './voice-section';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

const demoSpeech = vi.hoisted(() => ({
  speak: vi.fn(),
  speakSequence: vi.fn(),
  stopSequence: vi.fn(),
  listVoices: vi.fn(),
}));
vi.mock('./use-demo-speech', () => ({ useDemoSpeech: () => demoSpeech }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  demoSpeech.listVoices.mockResolvedValue([
    { id: 'voice-1', name: 'Samantha', language: 'en-US' },
    { id: 'voice-2', name: 'Daniel', language: 'en-GB' },
  ]);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

async function renderAsync(ui: React.ReactElement) {
  await act(async () => root.render(ui));
}

function typeInto(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function click(element: Element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function button(label: string): HTMLButtonElement {
  return [...container.querySelectorAll('button')].find(
    candidate => candidate.textContent?.trim() === label
  )!;
}

describe('Talk demo', () => {
  it('speaks a composed message and clears the composer', () => {
    render(<LiveDemoSection />);
    const composer = container.querySelector('textarea')!;
    typeInto(composer, 'Hello there');
    click(button('Speak'));

    expect(demoSpeech.speak).toHaveBeenCalledWith('Hello there');
    expect(composer.value).toBe('');
  });
});

describe('phrase and space demo', () => {
  it('matches only a live trailing phrase code', () => {
    expect(matchDemoCode('I made it, ty')).toEqual({ code: 'ty', phrase: 'Thank you' });
    expect(matchDemoCode('TY')).toEqual({ code: 'ty', phrase: 'Thank you' });
    expect(matchDemoCode('ty ')).toBeUndefined();
    expect(matchDemoCode('typing')).toBeUndefined();
  });

  it('expands a phrase code in the composer', () => {
    render(<PhraseCodesSection />);
    const composer = container.querySelector('textarea')!;
    typeInto(composer, 'I made it, ty');
    click(button('you'));

    expect(composer.value).toBe('I made it, Thank you ');
  });

  it('uses the selected space phrases in the composer and speech service', () => {
    render(<PhraseCodesSection />);
    click(button('Clinic'));
    expect(button('Clinic').getAttribute('aria-pressed')).toBe('true');

    click(button('My left arm feels weaker'));
    expect(container.querySelector('textarea')?.value).toBe('My left arm feels weaker ');
    click(button('Speak'));

    expect(demoSpeech.speak).toHaveBeenCalledWith('My left arm feels weaker');
  });
});

describe('voice demo', () => {
  it('previews the selected device voice', async () => {
    await renderAsync(<VoiceSection />);
    const select = container.querySelector('select')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(select, '1');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    click(button('Hear it'));

    expect(demoSpeech.speak).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: 'voice-2' })
    );
  });

  it('disables preview when the browser supplies no voices', async () => {
    demoSpeech.listVoices.mockResolvedValue([]);
    await renderAsync(<VoiceSection />);

    expect(button('Hear it').disabled).toBe(true);
  });
});

describe('note demo', () => {
  it('plays the note in sentence order and tracks the active sentence', () => {
    render(<NotesSection />);
    click(button('Play voice-over'));

    expect(demoSpeech.speakSequence.mock.calls[0][0]).toEqual([...NOTE_SENTENCES]);
    const hooks = demoSpeech.speakSequence.mock.calls[0][1];
    act(() => hooks.onPart(1));
    expect(container.querySelector('[data-spoken="true"]')?.textContent).toBe(NOTE_SENTENCES[1]);
  });

  it('presents the generated chunks in order', () => {
    render(<NotesSection />);
    click(button('Present'));

    expect(demoSpeech.speakSequence.mock.calls[0][0]).toEqual(
      PRESENT_CHUNKS.map(chunk => chunk.text)
    );
    const hooks = demoSpeech.speakSequence.mock.calls[0][1];
    act(() => hooks.onPart(1));
    expect(container.querySelector('[data-present-stage]')?.textContent).toContain(
      PRESENT_CHUNKS[1].text
    );
  });
});

describe('Agent demo', () => {
  it('switches the transcript to the selected request', () => {
    render(<AgentSection />);
    const choice = button(AGENT_DEMO_ASKS[1].label);
    click(choice);

    expect(choice.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain(AGENT_DEMO_ASKS[1].ask);
    expect(container.textContent).toContain(AGENT_DEMO_ASKS[1].reply);
  });
});

describe('landing navigation', () => {
  it('provides a target for every in-page navigation link', async () => {
    await renderAsync(<HomePage />);
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];

    for (const link of links) {
      expect(container.querySelector(link.hash), link.hash).toBeTruthy();
    }
  });
});
