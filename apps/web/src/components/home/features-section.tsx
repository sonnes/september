import { FileText, Film, MessageSquare, Mic, Rows3 } from 'lucide-react';

import { Card, CardContent } from '@/packages/ui/components/card';
import { Skeleton } from '@/packages/ui/components/skeleton';

const features = [
  {
    title: 'Conversation spaces',
    body: 'Keep family, projects, appointments, and work in separate places so the right words are close by.',
    icon: MessageSquare,
    accent: 'border-t-sky-600',
    panel: 'bg-sky-50',
    preview: 'spaces',
  },
  {
    title: 'One-tap phrases',
    body: 'Save common messages and tap them when you need them. September can also suggest useful next words.',
    icon: Rows3,
    accent: 'border-t-amber-600',
    panel: 'bg-amber-50',
    preview: 'phrases',
  },
  {
    title: 'Speak out loud',
    body: 'Build a message, then press Speak. Use browser speech, a chosen voice, or a connected voice service.',
    icon: Mic,
    accent: 'border-t-emerald-600',
    panel: 'bg-emerald-50',
    preview: 'speak',
  },
  {
    title: 'Notes for longer thoughts',
    body: 'Write prepared text inside a space, then use the same voice when it is time to share.',
    icon: FileText,
    accent: 'border-t-violet-600',
    panel: 'bg-violet-50',
    preview: 'notes',
  },
  {
    title: 'Reels from notes',
    body: 'Turn a note into a short captioned video you can download and share.',
    icon: Film,
    accent: 'border-t-rose-600',
    panel: 'bg-rose-50',
    preview: 'reels',
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="mb-3 text-sm font-bold text-indigo-600">What it helps with</p>
          <h2 className="text-3xl font-bold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
            Simple tools for everyday conversations.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500 sm:text-lg">
            Each part has a simple job: organize the conversation, reduce typing, and make the
            message easy to speak.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(feature => (
            <Card key={feature.title} className={`overflow-hidden border-t-4 ${feature.accent}`}>
              <CardContent className="grid gap-5 px-6">
                <div className="flex items-center gap-3">
                  <span className={`grid size-11 place-items-center rounded-lg ${feature.panel}`}>
                    <feature.icon className="size-5 text-zinc-700" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold text-zinc-950">{feature.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500">{feature.body}</p>
                <FeaturePreview preview={feature.preview} panel={feature.panel} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturePreview({
  preview,
  panel,
}: {
  preview: (typeof features)[number]['preview'];
  panel: string;
}) {
  if (preview === 'spaces') {
    return (
      <div
        data-feature-preview="spaces"
        className={`grid h-56 content-start gap-3 overflow-hidden rounded-xl p-3 ${panel}`}
        aria-hidden="true"
      >
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-9 w-36 shrink-0 rounded-lg bg-white/90 ring-1 ring-sky-200" />
          <Skeleton className="h-9 w-16 shrink-0 rounded-lg bg-white/70" />
        </div>
        <div className="rounded-xl border bg-white p-3">
          <Skeleton className="h-4 w-32 bg-zinc-200" />
          <Skeleton className="mt-3 h-10 w-4/5 rounded-lg bg-indigo-100" />
          <Skeleton className="mt-2 h-10 w-3/5 rounded-lg bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (preview === 'phrases') {
    return (
      <div
        data-feature-preview="phrases"
        className={`grid h-56 content-start gap-3 overflow-hidden rounded-xl p-3 ${panel}`}
        aria-hidden="true"
      >
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-full bg-amber-100 ring-1 ring-amber-200" />
          <Skeleton className="h-9 w-32 rounded-full bg-white/90" />
        </div>
        <div className="grid gap-2">
          <div className="flex gap-1.5">
            <Skeleton className="h-10 w-20 rounded-lg bg-white/90 ring-1 ring-border" />
            <Skeleton className="h-10 w-12 rounded-lg bg-white/90 ring-1 ring-border" />
            <Skeleton className="h-10 w-24 rounded-lg bg-white/90 ring-1 ring-border" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-10 w-28 rounded-lg bg-white/90 ring-1 ring-border" />
            <Skeleton className="h-10 w-16 rounded-lg bg-sky-100 ring-1 ring-sky-200" />
          </div>
        </div>
      </div>
    );
  }

  if (preview === 'notes') {
    return (
      <div
        data-feature-preview="notes"
        className={`grid h-56 content-start gap-3 overflow-hidden rounded-xl p-3 ${panel}`}
        aria-hidden="true"
      >
        <div className="rounded-xl border bg-white p-3">
          <Skeleton className="h-4 w-28 bg-zinc-200" />
          <Skeleton className="mt-3 h-4 w-full bg-zinc-100" />
          <Skeleton className="mt-2 h-4 w-5/6 bg-zinc-100" />
          <Skeleton className="mt-2 h-4 w-2/3 bg-zinc-100" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full bg-white/90 ring-1 ring-violet-200" />
          <Skeleton className="h-9 w-28 rounded-full bg-white/80" />
        </div>
      </div>
    );
  }

  if (preview === 'reels') {
    return (
      <div
        data-feature-preview="reels"
        className={`grid h-56 grid-cols-[minmax(0,1fr)_4.5rem] gap-3 overflow-hidden rounded-xl p-3 ${panel}`}
        aria-hidden="true"
      >
        <div className="grid content-start gap-3">
          <Skeleton className="h-4 w-28 bg-rose-200" />
          <Skeleton className="h-2 w-full rounded-full bg-white/90" />
          <Skeleton className="h-10 rounded-lg bg-white/90 ring-1 ring-rose-200" />
          <Skeleton className="h-10 w-28 rounded-lg bg-indigo-600" />
        </div>
        <div className="aspect-[9/16] self-start rounded-lg bg-zinc-950 ring-1 ring-rose-200" />
      </div>
    );
  }

  return (
    <div
      data-feature-preview="speak"
      className={`grid h-56 content-start gap-2 overflow-hidden rounded-xl p-3 ${panel}`}
      aria-hidden="true"
    >
      <div className="rounded-2xl border-2 bg-white p-2">
        <Skeleton className="h-10 w-2/3 rounded-lg bg-zinc-100" />
        <div
          data-feature-preview-controls="speak"
          className="mt-2 grid grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_4.5rem] items-center gap-2"
        >
          <Skeleton className="size-9 rounded-lg bg-white ring-1 ring-border" />
          <Skeleton className="size-9 rounded-lg bg-white ring-1 ring-border" />
          <Skeleton className="h-9 min-w-0 rounded-full bg-white ring-1 ring-border" />
          <Skeleton
            data-feature-preview-speak-button
            className="h-10 w-full rounded-lg bg-indigo-600"
          />
        </div>
      </div>
      <div className="grid gap-1 rounded-xl border bg-zinc-100 p-2">
        <div className="flex gap-1.5">
          {['w-7', 'w-7', 'w-7', 'w-7', 'w-7'].map((width, index) => (
            <Skeleton key={`${width}-${index}`} className={`h-7 ${width} rounded-md bg-white`} />
          ))}
        </div>
        <Skeleton className="h-7 rounded-md bg-white" />
      </div>
    </div>
  );
}
