import { useMemo, useState } from 'react';

import { Transcript } from '@september/app-ui/blocks/agent-transcript';
import type { AgentMessage, AgentToolName, AgentToolState } from '@september/core/rules/agent';
import { ArrowRight, Check, FileText, Pin } from 'lucide-react';

// The space the demo agent is looking at. Every row below is scoped to it —
// the real runtime binds a turn to the open space, so there is no other space
// for these tools to reach.
const DEMO_SPACE = {
  title: 'Silo',
  context:
    'Conversations about Silo with friends. Compare theories and reactions without spoilers.',
};

const NOTE_TEXT =
  'Silo discussion on Thursday. The rules make me suspicious. ' +
  'Who benefits from keeping everyone in the dark? What do we think is outside? ' +
  'I keep changing my mind about who to trust. No spoilers.';

const TIDIED_NOTE =
  'My take\n\nThe rules make me suspicious. I keep changing my mind about who to trust.\n\n' +
  'For discussion\n\nWho benefits from keeping everyone in the dark?\n' +
  'What do we think is outside?\n\nNo spoilers.';

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
  /** The words on the chip. A full request does not fit on one. */
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
  'Thursday conversations about Silo with friends. Compare theories about the ' +
  'outside world and who to trust. Keep the discussion spoiler-free.';

// Marketing-only turns. The tool names, the arguments, and the transcript that
// draws them are the app's own — only these three conversations are demo-local.
export const AGENT_DEMO_ASKS: readonly AgentDemoAsk[] = [
  {
    label: 'Make a space to talk about Silo',
    ask: 'Make a space for our conversations about Silo. I want to compare theories without spoiling anything.',
    steps: [
      // The user's own words are already the space's note by the time its
      // agent takes the first turn — so there is one note and nothing else.
      { name: 'inspect_space', args: {}, result: inspected(1, 0, 0) },
      {
        name: 'configure_space',
        args: { title: 'Silo', context: SPACE_CONTEXT },
        result: { ok: true },
      },
      {
        name: 'change_phrase',
        args: {
          operation: 'create',
          text: 'I have a different theory about Silo.',
          kind: 'phrase',
          pinned: true,
        },
        result: { ok: true },
      },
      {
        name: 'change_phrase',
        args: {
          operation: 'create',
          text: 'Who do you trust in Silo?',
          kind: 'phrase',
          pinned: true,
        },
        result: { ok: true },
      },
    ],
    reply:
      'Your Silo space is ready, with your discussion ideas and two phrases for comparing theories. I’ve added the no-spoilers preference to its context.',
  },
  {
    label: 'Add a phrase, and shorten another',
    ask: 'Add “What do you think is outside?” And shorten my phrase about not trusting the official story.',
    steps: [
      { name: 'inspect_space', args: {}, result: inspected(1, 6, 2) },
      {
        name: 'change_phrase',
        args: {
          operation: 'create',
          text: 'What do you think is outside?',
          kind: 'phrase',
          pinned: true,
        },
        result: { ok: true },
      },
      {
        name: 'change_phrase',
        args: {
          operation: 'edit',
          phrase_id: 'phrase-official-story',
          text: 'I don’t buy the official story.',
        },
        result: { ok: true },
      },
    ],
    reply:
      '“What do you think is outside?” is pinned. Your other phrase now reads “I don’t buy the official story.” Keep editing until they sound like you.',
  },
  {
    label: 'Organize my Silo theories',
    ask: 'Organize my Silo notes into my take and questions for the group. Keep my theories in my words.',
    steps: [
      {
        name: 'read_note',
        args: { note_id: 'note-thursday' },
        result: { name: 'Silo discussion', content: NOTE_TEXT, has_more: false },
      },
      {
        name: 'change_note',
        args: { operation: 'replace', note_id: 'note-thursday', text: TIDIED_NOTE },
        result: { ok: true },
      },
    ],
    reply:
      'Your take comes first, then two questions for the group. I’ve kept your theories in your words and the no-spoilers reminder.',
  },
];

export function AgentSection() {
  return (
    <section id="agent" className="scroll-mt-4 bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16">
          <div>
            <p className="mb-4 text-base font-medium text-indigo-700">Make September your own</p>
            <h2 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-950 sm:text-5xl">
              Say what you need.
              <br />
              The space changes.
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-zinc-700">
            Your Agent turns a conversation into a space that fits your life. Prepare phrases,
            organize notes, and keep changing things as your needs change.
          </p>
        </div>
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

  const phrases = demo.steps
    .filter(step => step.name === 'change_phrase')
    .map(step => String(step.args.text));
  const note = demo.steps.find(step => step.name === 'change_note');

  return (
    <div className="min-w-0">
      <div className="mb-8 flex flex-wrap gap-3" aria-label="Agent examples">
        {AGENT_DEMO_ASKS.map((one, index) => (
          <button
            key={one.label}
            type="button"
            aria-pressed={index === asked}
            onClick={() => choose(index)}
            className={`min-h-12 rounded-full border px-5 py-3 text-left text-base font-medium focus-visible:ring-2 focus-visible:ring-ring ${index === asked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:border-indigo-400'}`}
          >
            {one.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1.2fr] lg:items-center lg:gap-8">
        <div>
          <p className="mb-4 text-sm font-medium text-zinc-600">You ask</p>
          <p className="max-w-lg text-2xl font-medium leading-snug tracking-tight text-zinc-950 sm:text-3xl">
            “{demo.ask}”
          </p>
        </div>
        <ArrowRight className="size-8 rotate-90 text-indigo-600 lg:rotate-0" aria-hidden="true" />
        <div
          role="region"
          aria-label="Customized space"
          aria-live="polite"
          className="min-w-0 rounded-surface border border-zinc-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-5">
            <h3 className="text-2xl font-semibold text-zinc-950">{DEMO_SPACE.title}</h3>
            <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
              <Check className="size-4" aria-hidden="true" />
              Ready for you
            </span>
          </div>
          {phrases.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-medium text-zinc-600">Your phrases</p>
              <ul className="grid gap-3">
                {phrases.map(phrase => (
                  <li
                    key={phrase}
                    className="flex items-start gap-3 rounded-control border border-indigo-100 bg-indigo-50 px-4 py-3 text-xl font-medium leading-snug text-zinc-950"
                  >
                    <Pin className="mt-1 size-4 shrink-0 text-indigo-600" aria-hidden="true" />
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {note ? (
            <div>
              <p className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-600">
                <FileText className="size-4" aria-hidden="true" />
                Silo discussion
              </p>
              <p className="whitespace-pre-line text-lg leading-relaxed text-zinc-900">
                {String(note.args.text)}
              </p>
            </div>
          ) : (
            asked === 0 && (
              <div className="mt-6 border-t border-zinc-200 pt-5">
                <p className="flex items-center gap-2 text-base font-semibold text-zinc-950">
                  <FileText className="size-4 text-indigo-600" aria-hidden="true" />
                  Silo theories
                </p>
                <p className="mt-2 text-base leading-relaxed text-zinc-700">
                  Your questions and theories, kept in this space.
                </p>
              </div>
            )
          )}
        </div>
      </div>
      <details className="mt-8 border-t border-zinc-300 pt-3">
        <summary className="w-fit cursor-pointer py-3 text-sm font-medium text-zinc-700 focus-visible:ring-2 focus-visible:ring-ring">
          See the Agent conversation
        </summary>
        <div className="max-w-3xl py-5 [&_summary]:flex-wrap [&_summary]:gap-y-2">
          <Transcript
            rows={rows}
            busy={false}
            space={DEMO_SPACE}
            onApprove={() => setResolution('applied')}
            onReject={() => setResolution('rejected')}
          />
        </div>
      </details>
    </div>
  );
}

/** The demo turn as durable rows, exactly as the loop would have written them. */
function demoRows(demo: AgentDemoAsk, resolution?: Resolution): AgentMessage[] {
  const base = { space_id: 'landing-demo-space', created_at: 0, updated_at: 0 };
  const rows: AgentMessage[] = [{ ...base, id: 'ask', role: 'user', content: demo.ask }];

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
