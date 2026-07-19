import { useState } from 'react';

import { Pin, Volume2 } from 'lucide-react';

import { SectionHeader } from './section-header';
import { useDemoSpeech } from './use-demo-speech';

// One phrase set per demo space — switching rooms swaps the words at hand.
const DEMO_SPACES: { title: string; phrases: string[] }[] = [
  {
    title: 'Family',
    phrases: ['Good morning', 'I love you', 'What’s for dinner?', 'Turn the TV up, please'],
  },
  {
    title: 'Clinic',
    phrases: [
      'My left arm feels weaker',
      'Can you repeat that slowly?',
      'I’d like my caregiver present',
      'When is the next appointment?',
    ],
  },
  {
    title: 'Café',
    phrases: ['A flat white, please', 'Table by the window?', 'Could I see the menu?', 'The bill, please'],
  },
];

export function SpacesSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="order-2 lg:order-1">
          <SpacesDemo />
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeader
            eyebrow="Spaces"
            title="The right words for the room you’re in."
            lede="A space for family, one for the clinic, one for going out. Each keeps its own phrases, suggestions, and notes — so changing the conversation changes the words that are close at hand."
            hint="Switch spaces and watch the phrases change. Tap one to say it."
            accent="sky"
          />
        </div>
      </div>
    </section>
  );
}

function SpacesDemo() {
  const { speak } = useDemoSpeech();
  const [active, setActive] = useState(0);
  const [spoken, setSpoken] = useState<string[]>([]);

  const selectSpace = (index: number) => {
    setActive(index);
    setSpoken([]);
  };

  const sayPhrase = (phrase: string) => {
    setSpoken(current => [...current.slice(-1), phrase]);
    speak(phrase);
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-sky-50 p-4 shadow-sm ring-1 ring-sky-100">
      <div className="rounded-xl border bg-white p-4">
        {/* Space tabs — mirrors SpaceSwitch styling */}
        <div className="flex w-fit items-center gap-1 rounded-full border bg-card p-1">
          {DEMO_SPACES.map((space, index) => (
            <button
              key={space.title}
              type="button"
              aria-pressed={index === active}
              onClick={() => selectSpace(index)}
              className={
                index === active
                  ? 'h-11 shrink-0 whitespace-nowrap rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground'
                  : 'h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
              }
            >
              {space.title}
            </button>
          ))}
        </div>

        {/* The space's pinned phrases — tap to speak */}
        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_SPACES[active].phrases.map(phrase => (
            <button
              key={phrase}
              type="button"
              onClick={() => sayPhrase(phrase)}
              className="flex h-11 items-center gap-1.5 rounded-full border border-primary/30 bg-card px-5 text-base font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pin className="size-3.5 text-primary/60" aria-hidden="true" />
              {phrase}
            </button>
          ))}
        </div>

        {/* Mini transcript of what was tapped */}
        <div className="mt-4 flex min-h-16 flex-col items-end justify-end gap-2">
          {spoken.map((message, index) => (
            <div
              key={`${message}-${index}`}
              className="flex max-w-[85%] animate-in fade-in slide-in-from-bottom-1 items-start gap-2 rounded-lg rounded-br-sm bg-accent px-4 py-2.5 text-accent-foreground motion-reduce:animate-none"
            >
              <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden="true" />
              <p className="text-base leading-snug">{message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
