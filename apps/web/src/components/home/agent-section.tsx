import { useMemo, useState } from 'react';

import { Transcript } from '@september/app-ui/blocks/agent-transcript';
import type {
  AgentMessage,
  AgentToolName,
  AgentToolState,
} from '@september/core/rules/agent';

import { SectionHeader } from './section-header';

// The space the demo agent is looking at. Every row below is scoped to it —
// the real runtime binds a turn to the open space, so there is no other space
// for these tools to reach.
const DEMO_SPACE = {
  title: 'Clinic',
  context: 'Neurology appointments. My caregiver comes with me.',
};

const NOTE_TEXT =
  'Thursday, 2pm. Ask about the new dose and whether it explains the mornings. ' +
  'The swallowing has been worse this month, mostly with liquids. ' +
  'I want the physio referral before the next review.';

const TIDIED_NOTE =
  'Questions\n\n1. Does the new dose explain the mornings?\n2. Can I have the ' +
  'physio referral before the next review?\n\nSince the last visit\n\n' +
  'Swallowing is worse this month, mostly with liquids.';

/** One step of a demo turn, in the shape the real transcript reads. */
interface DemoStep {
  name: AgentToolName;
  args: Record<string, unknown>;
  /** What the tool answered. The row writes its own words from this. */
  result: Record<string, unknown>;
  /** Only a delete waits: it is the one act that leaves nothing to look at. */
  waits?: boolean;
}

export interface AgentDemoAsk {
  /** The words on the chip. A pasted letter does not fit on one. */
  label: string;
  /** What the user actually said. */
  ask: string;
  steps: DemoStep[];
  reply: string;
  /** What the agent says when a waiting change is turned down. */
  kept?: string;
}

/** What `inspect_space` answers — the row counts the rows, not their fields. */
const inspected = (notes: number, phrases: number, messages: number) => ({
  notes: Array.from({ length: notes }, () => ({})),
  phrases: Array.from({ length: phrases }, () => ({})),
  recent_talk_messages: Array.from({ length: messages }, () => ({})),
});

const SPACE_CONTEXT =
  'Neurology appointments at St Mary’s, with Dr Okafor and the nurse ' +
  'specialist. A review every eight weeks, usually with the speech therapist.';

// Marketing-only turns. The tool names, the arguments, and the transcript that
// draws them are the app's own — only these three conversations are demo-local.
export const AGENT_DEMO_ASKS: readonly AgentDemoAsk[] = [
  {
    label: 'Start a space from my clinic letter',
    ask:
      'I want a space for my neurology appointments. From the clinic letter: Dr Okafor, ' +
      'motor neurone clinic at St Mary’s, review every eight weeks with the nurse ' +
      'specialist and the speech therapist.',
    steps: [
      // The user's own words are already the space's note by the time its
      // agent takes the first turn — so there is one note and nothing else.
      { name: 'inspect_space', args: {}, result: inspected(1, 0, 0) },
      {
        name: 'configure_space',
        args: { title: 'Clinic', context: SPACE_CONTEXT },
        result: { ok: true },
      },
      {
        name: 'change_phrase',
        args: {
          operation: 'create',
          text: 'Could you say that more slowly?',
          kind: 'phrase',
          pinned: true,
        },
        result: { ok: true },
      },
      {
        name: 'change_phrase',
        args: {
          operation: 'create',
          text: 'I’d like my caregiver in the room.',
          kind: 'phrase',
          pinned: true,
        },
        result: { ok: true },
      },
    ],
    reply:
      'I named it Clinic, wrote what it’s for from your letter, and started it off with the phrases you’ll want at a review. It’s all in the space now — ask me to change any of it.',
  },
  {
    label: 'Add a phrase, and shorten another',
    ask:
      'Add a phrase for asking the nurse to slow down. And the long one about my ' +
      'medication is a mouthful — shorten it.',
    steps: [
      { name: 'inspect_space', args: {}, result: inspected(1, 6, 2) },
      {
        name: 'change_phrase',
        args: {
          operation: 'create',
          text: 'Could you say that more slowly?',
          kind: 'phrase',
          pinned: true,
        },
        result: { ok: true },
      },
      {
        name: 'change_phrase',
        args: {
          operation: 'edit',
          phrase_id: 'phrase-medication',
          text: 'It’s time for my medication.',
        },
        result: { ok: true },
      },
    ],
    reply:
      'The new one is pinned, so it stays in reach. The medication phrase now reads “It’s time for my medication.” — September gave it a code as it saved it.',
  },
  {
    label: 'Tidy my note before Thursday',
    ask: 'Tidy my note for Thursday’s appointment — put my questions at the top.',
    steps: [
      {
        name: 'read_note',
        args: { note_id: 'note-thursday' },
        result: { name: 'Thursday’s appointment', content: NOTE_TEXT, has_more: false },
      },
      {
        name: 'change_note',
        args: { operation: 'replace', note_id: 'note-thursday', text: TIDIED_NOTE },
        result: { ok: true },
      },
    ],
    reply:
      'Your two questions are at the top now, and the rest is in short paragraphs — so Present reads them one at a time.',
  },
];

export function AgentSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)] lg:items-center">
        <SectionHeader
          eyebrow="Agent"
          title="Say what you need. The space changes."
          lede="Beside Talk and Notes, every space has an Agent that can see only that space. Paste in a clinic letter and it sets the space up — a name, what it’s for, and the first phrases. After that, ask it for a phrase or to tidy a note before an appointment. Every change lands where you can see it, and deleting is the one thing it stops to check."
          hint="Press an ask and watch the work."
          accent="rose"
        />
        <AgentDemo />
      </div>
    </section>
  );
}

/** How a waiting change ended, once the reader has pressed something. */
type Resolution = Extract<AgentToolState, 'applied' | 'rejected'>;

function AgentDemo() {
  const [asked, setAsked] = useState(0);
  const [resolution, setResolution] = useState<Resolution | undefined>();

  const demo = AGENT_DEMO_ASKS[asked];
  const rows = useMemo(() => demoRows(demo, resolution), [demo, resolution]);

  const choose = (index: number) => {
    setAsked(index);
    setResolution(undefined);
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-rose-50 p-4 shadow-lg ring-1 ring-rose-100">
      <div className="grid gap-4 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {AGENT_DEMO_ASKS.map((one, index) => (
            <button
              key={one.label}
              type="button"
              aria-pressed={index === asked}
              onClick={() => choose(index)}
              className={
                index === asked
                  ? 'inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground'
                  : 'inline-flex min-h-11 items-center rounded-full border border-primary/30 bg-card px-5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              }
            >
              {one.label}
            </button>
          ))}
        </div>

        {/* The application's own transcript, on demo rows. */}
        <div className="flex flex-col gap-3">
          <Transcript
            rows={rows}
            busy={false}
            space={DEMO_SPACE}
            onApprove={() => setResolution('applied')}
            onReject={() => setResolution('rejected')}
          />
        </div>
      </div>
    </div>
  );
}

/** The demo turn as durable rows, exactly as the loop would have written them. */
function demoRows(demo: AgentDemoAsk, resolution?: Resolution): AgentMessage[] {
  const base = { space_id: 'landing-demo-space', created_at: 0, updated_at: 0 };
  const rows: AgentMessage[] = [
    { ...base, id: 'ask', role: 'user', content: demo.ask },
  ];

  for (const [index, step] of demo.steps.entries()) {
    rows.push({
      ...base,
      id: `step-${index}`,
      role: 'tool',
      content: JSON.stringify(step.result),
      tool_call_id: `call-${index}`,
      tool_name: step.name,
      tool_arguments: JSON.stringify(step.args),
      tool_state: step.waits ? (resolution ?? 'pending') : 'applied',
    });
  }

  // A turn that is waiting owes no answer yet — that is what waiting means.
  const waiting = demo.steps.some(step => step.waits);
  const said = !waiting
    ? demo.reply
    : resolution === 'applied'
      ? demo.reply
      : resolution === 'rejected'
        ? demo.kept
        : undefined;
  if (said) rows.push({ ...base, id: 'said', role: 'assistant', content: said });

  return rows;
}
