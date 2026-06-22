import { useState } from 'react';

import { createFileRoute, Link } from '@tanstack/react-router';
import { FileText, MessagesSquare } from 'lucide-react';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';
import { cn } from '@/packages/shared';
import { Button } from '@/packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/packages/ui/components/dialog';

export const Route = createFileRoute('/_app/help')({
  head: () => ({
    meta: [
      { title: pageTitle('Help') },
      { name: 'description', content: 'Step-by-step help for Talk and Notes.' },
    ],
  }),
  component: HelpPage,
});

type GuideStep = {
  title: string;
  body: string;
  image?: string;
  alt?: string;
};

const talkSteps: GuideStep[] = [
  {
    title: 'Open Talk',
    body: 'Use Talk when you want a short message spoken aloud.',
    image: '/help/talk-spaces.png',
    alt: 'Talk page showing the list of spaces and the New space button.',
  },
  {
    title: 'Choose or create a space',
    body: 'Pick the space for the conversation, or tap New space to start a fresh one.',
    image: '/help/talk-compose.png',
    alt: 'Talk space showing suggestions, the message box, and the Speak button.',
  },
  {
    title: 'Build a message',
    body: 'Tap a phrase, choose a suggestion, or type in the message box.',
  },
  {
    title: 'Speak it aloud',
    body: 'Tap Speak. Your spoken message appears in the transcript and can be replayed.',
  },
];

const notesSteps: GuideStep[] = [
  {
    title: 'Switch to Notes',
    body: 'Open the same space in Notes when you want a longer message or prepared text.',
    image: '/help/notes-editor.png',
    alt: 'Notes mode showing the note editor next to the notes panel.',
  },
  {
    title: 'Create or choose a note',
    body: 'Use New note, or select an existing note from the Notes panel.',
  },
  {
    title: 'Add text to note',
    body: 'Write in the note editor, or type in the bottom box and tap Add to note.',
  },
  {
    title: 'Play or export the note',
    body: 'Use the note controls to play voice-over, download audio, or export a reel.',
    image: '/help/notes-export.png',
    alt: 'Notes panel with voice-over, download, and export reel controls.',
  },
];

function GuideSection({
  title,
  description,
  icon: Icon,
  steps,
  className,
}: {
  title: string;
  description: string;
  icon: typeof MessagesSquare;
  steps: GuideStep[];
  className?: string;
}) {
  const headingId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [expandedStep, setExpandedStep] = useState<GuideStep | null>(null);

  return (
    <section className={cn('flex flex-col gap-4', className)} aria-labelledby={headingId}>
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 id={headingId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
        </div>
      </div>

      <ol className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <li
            key={`${title}-${step.title}-${index}`}
            className={cn(
              'overflow-hidden rounded-lg border bg-card',
              step.image && 'md:grid md:grid-cols-[minmax(0,1fr)_18rem]'
            )}
          >
            {step.image && step.alt ? (
              <button
                type="button"
                aria-label={`Expand screenshot: ${step.title}`}
                onClick={() => setExpandedStep(step)}
                className="group order-2 w-full border-t bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:order-none md:border-l md:border-t-0"
              >
                <img
                  src={step.image}
                  alt={step.alt}
                  className="aspect-[4/3] w-full object-cover object-top transition-opacity group-hover:opacity-90"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </button>
            ) : null}
            <div className="flex flex-1 gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Dialog open={!!expandedStep} onOpenChange={open => !open && setExpandedStep(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] p-3 sm:max-w-[min(96vw,1200px)]">
          <DialogTitle className="sr-only">{expandedStep?.title}</DialogTitle>
          <DialogDescription className="sr-only">{expandedStep?.alt}</DialogDescription>
          {expandedStep?.image && expandedStep.alt ? (
            <img
              src={expandedStep.image}
              alt={expandedStep.alt}
              className="max-h-[85vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function HelpPage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Help' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="wide">
          <PageTitle
            title="Help"
            description="Step-by-step help for speaking short messages in Talk and preparing longer notes."
            actions={
              <div className="flex items-center gap-2">
                <Button asChild size="lg">
                  <Link to="/talk">Open Talk</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/notes">Open Notes</Link>
                </Button>
              </div>
            }
          />

          <GuideSection
            title="Use Talk"
            description="Talk turns a short typed message into spoken audio during a live conversation."
            icon={MessagesSquare}
            steps={talkSteps}
          />

          <GuideSection
            title="Use Notes"
            description="Notes keeps longer prepared text inside the same conversation space."
            icon={FileText}
            steps={notesSteps}
          />
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
