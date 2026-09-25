import { useState } from 'react';

import { AudioLines, Plus } from 'lucide-react';

import { draftParts, tagLabel } from '@september/core/rules/audio-tags';
import { MOODS, type MoodKey } from '@september/core/rules/moods';

// One line for each mood, with the example tags of that mood.
const LINES: Record<MoodKey, string> = {
  warm: '[warmly] It is so good to see you.',
  playful: 'What did you [mischievously] break this time?',
  low: '[sighs] I need a quiet day today.',
  frustrated: '[frustrated sigh] Can we try that one more time?',
  angry: '[firmly] No. Please stop doing that.',
};

export function ExpressionSection() {
  return (
    <details className="group border-t border-zinc-200 last:border-b">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-6 py-7 focus-visible:outline-offset-4 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <div className="grid flex-1 gap-3 lg:grid-cols-[12rem_1fr] lg:gap-8">
          <p className="text-sm font-semibold text-indigo-600">Expression</p>
          <div>
            <h2 className="text-xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-2xl">
              Say it the way you feel it.
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600">
              Pick a mood, and the suggestions change their tone. With an Eleven v3 voice, tags
              like [laughs] and [sighs] tell your voice how to say each line.
            </p>
          </div>
        </div>
        <Plus className="size-6 shrink-0 text-indigo-600 group-open:rotate-45" aria-hidden="true" />
      </summary>
      <div className="mx-auto max-w-3xl pb-10">
        <p className="mb-5 text-sm font-medium text-indigo-700">
          Choose a mood to see how a line changes.
        </p>
        <ExpressionDemo />
      </div>
    </details>
  );
}

function ExpressionDemo() {
  const [mood, setMood] = useState<MoodKey>('playful');

  return (
    <div className="grid gap-5 rounded-surface border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mood">
        {MOODS.map(one => (
          <button
            key={one.key}
            type="button"
            aria-label={one.label}
            aria-pressed={mood === one.key}
            onClick={() => setMood(one.key)}
            className="grid size-12 place-items-center rounded-full border border-transparent text-2xl transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/10"
          >
            <span aria-hidden="true">{one.emoji}</span>
          </button>
        ))}
      </div>

      <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-xl leading-snug text-accent-foreground">
        {draftParts(LINES[mood]).map((part, index) =>
          part.tag ? (
            <span
              key={index}
              data-tag
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 align-baseline text-base font-medium text-primary"
            >
              <AudioLines className="size-[0.9em] shrink-0" aria-hidden="true" />
              {tagLabel(part.text)}
            </span>
          ) : (
            part.text
          )
        )}
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        The voice reads a tag as a direction and does not say it aloud. Other voices get the words
        without the tags.
      </p>
    </div>
  );
}
