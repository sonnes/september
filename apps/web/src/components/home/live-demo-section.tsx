import { type ReactNode, useCallback, useState } from 'react';

import {
  Home,
  MessageSquare,
  Mic,
  PanelLeft,
  PanelRight,
  Pencil,
  RotateCcw,
  Trash2,
  Volume2,
} from 'lucide-react';

import { EditorProvider, useEditorContext } from '@/packages/editor';
import { DEFAULT_SPACE_TITLE } from '@/packages/spaces';
import { Button } from '@/packages/ui/components/button';

const quickSuggestions = [
  'evening',
  'How was your day?',
  'Anything interesting?',
  "Let's talk about it",
];

export function LiveDemoSection() {
  return (
    <section id="how" className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-bold text-indigo-600">Live demo</p>
          <h2 className="text-3xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-4xl">
            Type a little.
            <br />
            Tap a suggestion.
            <br />
            Speak.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-500 sm:text-lg">
            The main screen is for one simple job: build a message faster and press Speak when it is
            ready.
          </p>
        </div>

        <EditorProvider defaultText="Good">
          <WorkingDemo />
        </EditorProvider>
      </div>
    </section>
  );
}

function WorkingDemo() {
  const [spoken, setSpoken] = useState([DEFAULT_SPACE_TITLE, 'Reyu, how was your day today?']);
  const { text, setText, trackKeystroke } = useEditorContext();

  const speak = useCallback(
    (value = text) => {
      const message = value.trim();
      if (!message) return;
      setSpoken(current => [...current.slice(-3), message]);
      setText('');
    },
    [setText, text]
  );

  const applySuggestion = (suggestion: string) => {
    setText(current => {
      if (!current.trim()) return suggestion;
      return `${current.trim()} ${suggestion}`;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-100 p-2 shadow-sm sm:p-4">
      <div
        data-live-demo-frame
        className="grid h-[520px] overflow-hidden rounded-xl border bg-white shadow-sm sm:h-[540px] lg:h-[560px] lg:grid-cols-[64px_minmax(0,1fr)]"
      >
        <aside className="hidden flex-col items-center gap-3 bg-indigo-600 px-3 py-5 lg:flex">
          <img src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
          <nav className="flex flex-1 flex-col gap-3 pt-9" aria-label="Demo navigation">
            <DemoIcon>
              <Home />
            </DemoIcon>
            <DemoIcon active>
              <MessageSquare />
            </DemoIcon>
            <DemoIcon>
              <Pencil />
            </DemoIcon>
            <DemoIcon>
              <Mic />
            </DemoIcon>
          </nav>
        </aside>

        <div className="grid min-w-0 grid-rows-[52px_minmax(0,1fr)] lg:grid-rows-[64px_minmax(0,1fr)]">
          <header className="flex items-center gap-3 border-b px-3 lg:px-5">
            <span className="grid size-11 place-items-center rounded-lg border text-zinc-500">
              <PanelLeft className="size-5" aria-hidden="true" />
            </span>
            <strong className="min-w-0 truncate text-sm text-zinc-950 sm:text-base">
              {DEFAULT_SPACE_TITLE}
            </strong>
            <span className="ml-auto hidden size-11 place-items-center rounded-lg border text-zinc-500 sm:grid">
              <PanelRight className="size-5" aria-hidden="true" />
            </span>
          </header>

          <main className="flex min-w-0 flex-col overflow-hidden p-3 sm:p-4">
            <div className="hidden min-h-0 flex-1 flex-col justify-end gap-3 pb-4 sm:flex">
              <div className="self-center rounded-lg border border-dashed bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-500">
                Build a sentence below, then tap Speak.
              </div>
              {spoken.map((message, index) => (
                <div
                  key={`${message}-${index}`}
                  className="max-w-[84%] self-end rounded-xl rounded-br px-4 py-3 text-lg font-medium bg-indigo-50 text-indigo-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <Volume2 className="size-4" aria-hidden="true" />
                    {message}
                  </span>
                </div>
              ))}
            </div>

            <section className="mt-auto grid min-h-0 min-w-0 gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                    className={
                      index === 0
                        ? 'min-h-10 rounded-full border-emerald-200 bg-emerald-100 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-100'
                        : 'min-h-10 rounded-full bg-white px-4 text-sm font-bold text-indigo-700'
                    }
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              <div className="rounded-2xl border-2 bg-white p-3 sm:p-4">
                <textarea
                  value={text}
                  onChange={event => setText(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      speak();
                    }
                    if (
                      event.key.length === 1 ||
                      event.key === 'Backspace' ||
                      event.key === 'Enter'
                    ) {
                      trackKeystroke();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={2}
                  className="min-h-20 w-full resize-none bg-transparent text-2xl font-semibold leading-snug text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Undo"
                    className="size-10"
                    onClick={() => setText('Good')}
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Clear"
                    className="size-10"
                    onClick={() => setText('')}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                  <span className="hidden min-h-10 items-center rounded-full border bg-white px-4 text-sm font-semibold text-zinc-500 sm:inline-flex">
                    Default speaker
                  </span>
                  <Button
                    type="button"
                    onClick={() => speak()}
                    disabled={!text.trim()}
                    className="ml-auto min-h-11 px-5 font-bold"
                  >
                    <Volume2 className="size-4" aria-hidden="true" />
                    Speak
                  </Button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function DemoIcon({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={
        active
          ? 'grid size-9 place-items-center rounded-lg bg-indigo-700 text-white'
          : 'grid size-9 place-items-center rounded-lg text-white/80'
      }
    >
      <span className="[&_svg]:size-5">{children}</span>
    </span>
  );
}
