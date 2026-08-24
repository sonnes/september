// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AboutSection } from './about-section';
import { EnhancedCTASection } from './enhanced-cta-section';
import { Footer } from './footer';
import { HeroSection } from './hero-section';
import { LANDING_SPACE_SEED, LiveDemoSection } from './live-demo-section';
import { NOTE_SENTENCES, NOTE_TITLE, NotesSection } from './notes-section';
import { PhraseCodesSection, matchDemoCode } from './phrase-codes-section';
import { PrivacySection } from './privacy-section';
import { PRESENT_CHUNKS, PresentSection } from './present-section';
import { SetupChoicesSection } from './setup-choices-section';
import { SpacesSection } from './spaces-section';
import { VoiceSection } from './voice-section';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lacks ResizeObserver, which SuggestionStripes uses to measure its
// container. Stub it; clientWidth is 0 in jsdom so the scale math
// short-circuits to 1 and never touches the layout engine.
class ResizeObserverStub {
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Every prototype speaks through this one seam; the real hook needs the
// speech + audio providers, which the route supplies.
const demoSpeech = vi.hoisted(() => ({
  speak: vi.fn(),
  speakSequence: vi.fn(),
  stopSequence: vi.fn(),
  listVoices: vi.fn(),
}));
vi.mock('./use-demo-speech', () => ({
  useDemoSpeech: () => demoSpeech,
}));

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

/** Type into a React-controlled textarea via the native value setter. */
function typeInto(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('hero section', () => {
  it('uses the keycap mark and autocomplete wordmark', () => {
    render(<HeroSection />);

    const nav = container.querySelector('nav')!;
    expect(nav.querySelector('img')?.getAttribute('src')).toBe('/logo.svg');
    expect(nav.querySelector('[data-brand-wordmark]')?.textContent).toBe('September');
  });

  it('renders the hero copy and actions', () => {
    render(<HeroSection />);

    expect(container.textContent).toContain('Faster Communication');
    expect(container.textContent).toContain('Fewer Keystrokes');
    expect(container.textContent).toContain(
      'A communication assistant for people living with ALS, MND, and other speech & motor difficulties'
    );
    expect(container.textContent).toContain('Get Started');
    expect(container.textContent).toContain('Open Source');
    expect(container.textContent).not.toContain('Try Now');
  });

  it('links Features and About in the nav to their page sections', () => {
    render(<HeroSection />);

    const features = [...container.querySelectorAll('a')].find(
      anchor => anchor.textContent?.trim() === 'Features'
    )!;
    const about = [...container.querySelectorAll('a')].find(
      anchor => anchor.textContent?.trim() === 'About'
    )!;
    expect(features.getAttribute('href')).toBe('#features');
    expect(about.getAttribute('href')).toBe('#about');
  });

  it('answers cost and privacy and sets the working-demo contract', () => {
    render(<HeroSection />);

    expect(container.textContent).toContain('Free to use.');
    expect(container.textContent).toContain('Your words can stay on this device.');
    // The line that frames the whole page: the demos below are real.
    expect(container.textContent).toContain(
      'Everything on this page is the real thing — try it as you scroll.'
    );
  });

  it('keeps hero actions accessible for motor-impaired users', () => {
    render(<HeroSection />);

    // One Get Started — the hero CTA; the nav carries only section links.
    const onboardingLinks = [...container.querySelectorAll('a')].filter(
      anchor => anchor.textContent?.trim() === 'Get Started'
    );
    expect(onboardingLinks).toHaveLength(1);
    const [cta] = onboardingLinks;
    expect(cta.className).toContain('h-11');
    // White pill with indigo text — no muddy amber button on the indigo card.
    expect(cta.className).toContain('bg-primary-foreground');
    expect(cta.className).toContain('text-indigo-600');
    expect(cta.className).not.toContain('bg-amber-500');
  });

  it('keeps the nav to section links only — no GitHub, no duplicate CTA', () => {
    render(<HeroSection />);

    const nav = container.querySelector('nav')!;
    expect(nav.textContent).not.toContain('GitHub');
    expect(nav.textContent).not.toContain('Get Started');
    expect(nav.textContent).toContain('Features');
    expect(nav.textContent).toContain('About');
    // The Open Source badge in the hero body still links to the repo.
    expect(container.textContent).toContain('Open Source');
  });
});

describe('talk section (live demo)', () => {
  it('renders the flagship talk copy', () => {
    render(<LiveDemoSection />);

    // The nav's "Features" link lands here.
    expect(container.querySelector('#features')).toBeTruthy();
    expect(container.textContent).toContain('Talk');
    expect(container.textContent).toContain('Type a little. Tap the rest. Speak.');
    expect(container.textContent).toContain('This is September’s main screen.');
    expect(container.textContent).toContain('press Speak — your browser will say it');
    expect(container.textContent).toContain(LANDING_SPACE_SEED.title);
    expect(container.textContent).toContain(LANDING_SPACE_SEED.phrases[0].text);
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('lets the live demo frame grow on mobile instead of clipping', () => {
    render(<LiveDemoSection />);

    const frame = container.querySelector('[data-live-demo-frame]')!;
    expect(frame.classList.contains('min-h-[520px]')).toBe(true);
    expect(frame.classList.contains('sm:h-[540px]')).toBe(true);
    expect(frame.classList.contains('lg:h-[560px]')).toBe(true);
  });

  it('keeps a seeded transcript and a 44px Speak target', () => {
    render(<LiveDemoSection />);

    expect(container.textContent).toContain('Good morning! Ready when you are.');
    const speakButton = [...container.querySelectorAll('button')].find(
      button => button.textContent?.trim() === 'Speak'
    )!;
    expect(speakButton.classList.contains('min-h-11')).toBe(true);
  });

  it('keeps the marketing demo phrases dignified', () => {
    render(<LiveDemoSection />);

    expect(container.textContent?.toLowerCase()).not.toContain('bathroom');
  });

  it('speaks the composed message out loud on Speak', () => {
    render(<LiveDemoSection />);

    const textarea = container.querySelector('textarea')!;
    typeInto(textarea, 'Hello there');
    const speakButton = [...container.querySelectorAll('button')].find(
      button => button.textContent?.trim() === 'Speak'
    )!;
    click(speakButton);

    expect(demoSpeech.speak).toHaveBeenCalledWith('Hello there');
    expect(container.textContent).toContain('Hello there');
  });

  it('hides the horizontal scrollbar on suggestion stripe rows', () => {
    render(<LiveDemoSection />);

    const rows = [...container.querySelectorAll('.overflow-x-auto')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.className).toContain('[scrollbar-width:none]');
    }
  });
});

describe('phrase codes section', () => {
  it('matches a trailing code word through the real matchCode, case-insensitively', () => {
    expect(matchDemoCode('I made it, ty')).toEqual({ code: 'ty', phrase: 'Thank you' });
    expect(matchDemoCode('TY')).toEqual({ code: 'ty', phrase: 'Thank you' });
    expect(matchDemoCode('hlp')).toEqual({ code: 'hlp', phrase: 'I need some help please' });
    expect(matchDemoCode('wtr')).toEqual({ code: 'wtr', phrase: 'Water, please' });
    // A completed word (trailing space) is never a live trigger.
    expect(matchDemoCode('ty ')).toBeUndefined();
    expect(matchDemoCode('typing')).toBeUndefined();
    expect(matchDemoCode('')).toBeUndefined();
  });

  it('renders the codes copy and the demo legend', () => {
    render(<PhraseCodesSection />);

    expect(container.textContent).toContain('Saved phrases & codes');
    expect(container.textContent).toContain('Your everyday sentences, two letters away.');
    for (const [code, phrase] of [
      ['ty', 'Thank you'],
      ['hlp', 'I need some help please'],
      ['wtr', 'Water, please'],
    ]) {
      expect(container.textContent).toContain(code);
      expect(container.textContent).toContain(phrase);
    }
    // Marketing examples stay dignified — no bathroom phrases on the page.
    expect(container.textContent?.toLowerCase()).not.toContain('bathroom');
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('surfaces the phrase as a stripe when its code is typed, and swaps on take', () => {
    render(<PhraseCodesSection />);

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    typeInto(textarea, 'I made it, ty');

    const youTile = [...container.querySelectorAll('button')].find(
      button => button.textContent === 'you'
    )!;
    expect(youTile).toBeTruthy();
    click(youTile);

    expect(textarea.value).toBe('I made it, Thank you ');
  });

  it('speaks the swapped message with a visible Speak button', () => {
    render(<PhraseCodesSection />);

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const speakButton = [...container.querySelectorAll('button')].find(
      button => button.textContent?.trim() === 'Speak'
    )!;
    expect(speakButton).toBeTruthy();
    expect(speakButton.classList.contains('min-h-11')).toBe(true);

    typeInto(textarea, 'I made it myself');
    click(speakButton);

    expect(demoSpeech.speak).toHaveBeenCalledWith('I made it myself');
    // The spoken message lands in a visible transcript bubble.
    expect(container.textContent).toContain('I made it myself');
    expect(textarea.value).toBe('');
  });
});

describe('spaces section', () => {
  it('renders the spaces copy and three demo spaces', () => {
    render(<SpacesSection />);

    expect(container.textContent).toContain('The right words for the room you’re in.');
    for (const space of ['Family', 'Clinic', 'Café']) {
      expect(container.textContent).toContain(space);
    }
    // Family is the default space.
    expect(container.textContent).toContain('What’s for dinner?');
  });

  it('keeps space tabs at the 44px touch floor', () => {
    render(<SpacesSection />);

    for (const tab of ['Family', 'Clinic', 'Café']) {
      const button = [...container.querySelectorAll('button')].find(
        candidate => candidate.textContent?.trim() === tab
      )!;
      expect(button.className).toContain('h-11');
    }
  });

  it('swaps phrases when switching spaces', () => {
    render(<SpacesSection />);

    const clinicTab = [...container.querySelectorAll('button')].find(
      button => button.textContent?.trim() === 'Clinic'
    )!;
    click(clinicTab);

    expect(clinicTab.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('My left arm feels weaker');
    expect(container.textContent).not.toContain('What’s for dinner?');
  });

  it('speaks a phrase when tapped', () => {
    render(<SpacesSection />);

    const phrase = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('What’s for dinner?')
    )!;
    click(phrase);

    expect(demoSpeech.speak).toHaveBeenCalledWith('What’s for dinner?');
  });
});

describe('voice section', () => {
  it('leads with cloning and links into the app', async () => {
    await renderAsync(<VoiceSection />);

    expect(container.textContent).toContain('Keep your own voice.');
    expect(container.textContent).toContain('30-second recording');
    const cloneLink = [...container.querySelectorAll('a')].find(anchor =>
      anchor.textContent?.includes('Start cloning')
    )!;
    expect(cloneLink).toBeTruthy();
    expect(cloneLink.getAttribute('href')).toBe('/welcome');
  });

  it('lists the device voices and previews the selected one', async () => {
    await renderAsync(<VoiceSection />);

    const select = container.querySelector('select')!;
    expect(select.querySelectorAll('option')).toHaveLength(2);
    expect(container.textContent).toContain('Samantha');

    const preview = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('Hear it')
    )!;
    click(preview);

    expect(demoSpeech.speak).toHaveBeenCalledWith(
      expect.stringContaining('September'),
      expect.objectContaining({ id: 'voice-1' })
    );
  });

  it('falls back calmly when no voices are available', async () => {
    demoSpeech.listVoices.mockResolvedValue([]);
    await renderAsync(<VoiceSection />);

    expect(container.textContent).toContain('No voices available in this browser');
  });
});

describe('section accents', () => {
  it('gives each feature section its own colour lane', async () => {
    render(<LiveDemoSection />);
    expect(container.querySelector('.bg-indigo-50')).toBeTruthy();

    render(<PhraseCodesSection />);
    expect(container.querySelector('.bg-amber-50')).toBeTruthy();

    render(<SpacesSection />);
    expect(container.querySelector('.bg-sky-50')).toBeTruthy();

    await renderAsync(<VoiceSection />);
    expect(container.querySelector('.bg-emerald-50')).toBeTruthy();

    render(<NotesSection />);
    expect(container.querySelector('.bg-violet-50')).toBeTruthy();

    render(<PresentSection />);
    expect(container.querySelector('.bg-rose-50')).toBeTruthy();
  });
});

describe('notes section', () => {
  it('renders the note and plays it sentence by sentence', () => {
    render(<NotesSection />);

    expect(container.textContent).toContain('Longer thoughts, ready ahead of time.');
    expect(container.textContent).toContain(NOTE_TITLE);
    for (const sentence of NOTE_SENTENCES) {
      expect(container.textContent).toContain(sentence);
    }

    const play = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('Play voice-over')
    )!;
    click(play);

    expect(demoSpeech.speakSequence).toHaveBeenCalledTimes(1);
    expect(demoSpeech.speakSequence.mock.calls[0][0]).toEqual([...NOTE_SENTENCES]);
  });

  it('highlights the sentence being spoken', () => {
    render(<NotesSection />);

    const play = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('Play voice-over')
    )!;
    click(play);

    const hooks = demoSpeech.speakSequence.mock.calls[0][1];
    act(() => hooks.onPart(1));

    const highlighted = container.querySelector('[data-spoken="true"]')!;
    expect(highlighted.textContent).toBe(NOTE_SENTENCES[1]);
  });
});

describe('present section', () => {
  it('renders the stage in the default tone, with no grain or vignette', () => {
    render(<PresentSection />);

    expect(container.textContent).toContain('Fill the room with it, or send it as a file.');
    // The first chunk is on the stage before anything is pressed.
    expect(container.textContent).toContain(PRESENT_CHUNKS[0].text);

    const stage = container.querySelector('[data-present-stage]') as HTMLElement;
    expect(stage).toBeTruthy();
    // The indigo tone from the shared rules — no grain, no vignette.
    expect(stage.style.backgroundColor).toBe('rgb(79, 70, 229)');
    expect(stage.style.backgroundImage).toBe('');
  });

  it('presents the same story as the note above it', () => {
    render(<NotesSection />);
    expect(container.textContent).toContain('red bicycle');

    // The stage shows one chunk at a time, so check the sequence itself.
    const story = PRESENT_CHUNKS.map(chunk => chunk.text).join(' ');
    expect(story).toContain('red bicycle');
    expect(story).toContain('That’s how we met.');
    expect(NOTE_SENTENCES.join(' ')).toContain('That’s how we met.');
  });

  it('speaks the chunks in order', () => {
    render(<PresentSection />);

    const play = [...container.querySelectorAll('button')].find(button =>
      button.textContent?.includes('Present')
    )!;
    click(play);

    expect(demoSpeech.speakSequence).toHaveBeenCalledTimes(1);
    expect(demoSpeech.speakSequence.mock.calls[0][0]).toEqual(
      PRESENT_CHUNKS.map(chunk => chunk.text)
    );

    const hooks = demoSpeech.speakSequence.mock.calls[0][1];
    act(() => hooks.onPart(1));
    expect(container.textContent).toContain(PRESENT_CHUNKS[1].text);
  });
});

describe('about section', () => {
  it('tells the founder story and links the full article', () => {
    render(<AboutSection />);

    expect(container.querySelector('#about')).toBeTruthy();
    expect(container.textContent).toContain('About');
    expect(container.textContent).toContain('ALS in 2019');
    expect(container.textContent).toContain('Clicks are precious');
    // The blockquote is verbatim from the article, not a paraphrase.
    expect(container.querySelector('blockquote')?.textContent).toContain(
      'I should not have to type out full phrases and sentences every time.'
    );

    const article = [...container.querySelectorAll('a')].find(anchor =>
      anchor.textContent?.includes('Read the full story')
    )!;
    expect(article).toBeTruthy();
    expect(article.getAttribute('href')).toBe('https://raviatluri.in/articles/building-september');
  });
});

describe('privacy section', () => {
  it('states the on-device promise', () => {
    render(<PrivacySection />);

    expect(container.textContent).toContain('Private by design');
    expect(container.textContent).toContain('Your words can stay on this device.');
    expect(container.textContent).toContain('On-device voice & suggestions');
    expect(container.textContent).toContain('Open source');
  });
});

describe('setup choices section', () => {
  it('shows the browser setup choices', () => {
    render(<SetupChoicesSection />);

    expect(container.textContent).toContain('Choose the setup that feels right.');
    expect(container.textContent).toContain('Free start');
    expect(container.textContent).toContain('Local word suggestions');
    expect(container.textContent).toContain('Use your own services');
    expect(container.textContent).toContain('OpenRouter');
  });
});

describe('final call to action', () => {
  it('keeps the ask plain and warm', () => {
    render(<EnhancedCTASection />);

    expect(container.textContent).toContain('Being understood shouldn’t be hard work.');
    expect(container.textContent).toContain(
      'Set up September in a few minutes — on your own, or with a caregiver beside you.'
    );
    expect(container.textContent).toContain('Get Started');
    expect(container.textContent).not.toContain('it’s free.');
  });
});

describe('footer', () => {
  it('keeps footer text and links in a simple layout', () => {
    render(<Footer />);

    expect(container.textContent).toContain('Communication with fewer keystrokes.');
    expect(container.textContent).toContain('Privacy');
    expect(container.textContent).toContain('Source');
  });

  it('offers Features and About in the footer so mobile can reach them', () => {
    render(<Footer />);

    const features = [...container.querySelectorAll('a')].find(
      anchor => anchor.textContent?.trim() === 'Features'
    )!;
    const about = [...container.querySelectorAll('a')].find(
      anchor => anchor.textContent?.trim() === 'About'
    )!;
    expect(features.getAttribute('href')).toBe('#features');
    expect(about.getAttribute('href')).toBe('#about');
  });
});
