import { type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  Eye,
  Pencil,
  Pin,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@september/ui/components/button";
import {
  agentProposalIsDelete,
  agentProposalIsUnpin,
  agentProposalLines,
  agentToolOutcome,
  agentToolResult,
  agentToolSummary,
  groupAgentTurns,
  parseAgentToolArguments,
  type AgentChangeLine,
  type AgentMessage,
  type AgentToolTone,
  type AgentTurnPart,
} from "@september/core/rules/agent";

/**
 * The Agent transcript.
 *
 * One rule holds the whole screen together: anything the user must act on is
 * a card, and everything else is a line. A read that ran is a footnote to the
 * answer it produced; a change waiting for a press is the reason the screen
 * is there. Giving both the same weight, as the first version did, made a
 * question answered after three reads read as four pieces of paperwork.
 */

const MARKS: Record<AgentToolTone, { icon: typeof Check; className: string }> =
  {
    read: { icon: Eye, className: "bg-muted text-muted-foreground" },
    applied: { icon: Check, className: "bg-emerald-50 text-emerald-600" },
    rejected: { icon: X, className: "bg-muted text-muted-foreground" },
    failed: { icon: TriangleAlert, className: "bg-red-50 text-destructive" },
    pending: { icon: Clock, className: "bg-accent text-accent-foreground" },
  };

/**
 * One folded line of work.
 *
 * The whole row is the control, at 44px, and the fold state lives on the row
 * rather than on a separate handle beside it — one reach, not two.
 */
export function ToolLine({
  tone,
  title,
  label,
  pairs = [],
  note,
}: {
  tone: AgentToolTone;
  title: string;
  /** The word beside the mark. Colour is never the only signal. */
  label?: string;
  /** What the tool did or found. One of these needs no fold to hold it. */
  pairs?: readonly { label: string; value: string }[];
  /** A sentence that will not fit on the row, like why a write did not land. */
  note?: string;
}) {
  const mark = MARKS[tone];
  const Icon = mark.icon;
  // One pair reads on the row itself, and its label only repeats the title.
  const inline = !note && pairs.length === 1 ? pairs[0].value : "";
  const folds = Boolean(note) || pairs.length > 1;

  const face = (
    <>
      <span
        className={`grid size-[22px] shrink-0 place-items-center rounded-full ${mark.className}`}
      >
        <Icon className="size-3" aria-hidden />
      </span>
      <span className="text-foreground/80 shrink-0 font-medium">{title}</span>
      {inline ? <span className="truncate">{inline}</span> : null}
      <span className="text-muted-foreground/70 ml-auto flex shrink-0 items-center gap-2 text-xs">
        {label}
        {folds ? (
          <ChevronRight
            className="size-4 transition-transform group-open:rotate-90"
            aria-hidden
          />
        ) : null}
      </span>
    </>
  );

  // A control that does nothing is worse than no control, and this one is
  // 44px of a screen that may be driven by switch or gaze.
  if (!folds) {
    return (
      <div className="text-muted-foreground flex min-h-11 items-center gap-2.5 pr-2.5 text-sm">
        {face}
      </div>
    );
  }

  return (
    <details className="group">
      <summary className="hover:bg-muted/60 focus-visible:ring-ring text-muted-foreground flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-xl pr-2.5 text-sm hover:text-foreground focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {face}
      </summary>
      <div className="border-border bg-muted/40 text-muted-foreground mt-0.5 mb-2 ml-8 rounded-xl border p-3 text-sm leading-relaxed">
        {note ?? <Pairs pairs={pairs} />}
      </div>
    </details>
  );
}

/** A two-column list. Everything a folded line opens onto starts with one. */
function Pairs({
  pairs,
}: {
  pairs: readonly { label: string; value: string }[];
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      {pairs.map((pair, at) => (
        <div key={at} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-foreground/70 font-medium whitespace-nowrap">
            {pair.label}
          </dt>
          <dd className="min-w-0 break-words">{pair.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The name of a tool row, which is never the raw result it carries. */
const nameOf = (row: AgentMessage): string =>
  row.tool_name && row.tool_arguments
    ? agentToolSummary(row.tool_name, row.tool_arguments)
    : row.content;

/**
 * What each tool in a run did, and what it found or changed.
 *
 * One tool needs no list — its own row says it, and a label repeating the
 * title would say nothing. A run of them does, and it names every tool,
 * including any with nothing to report, because the row promised "and 2
 * more".
 */
function runPairs(rows: readonly AgentMessage[]) {
  // What a change wrote says more than the fact that it landed, so the
  // change speaks first and "Done." is only ever a fallback.
  const value = (row: AgentMessage): string =>
    agentProposalLines(row)[0]?.value || agentToolResult(row);
  if (rows.length === 1) {
    const only = value(rows[0]);
    return only ? [{ label: nameOf(rows[0]), value: only }] : [];
  }
  return rows.map((row) => ({ label: nameOf(row), value: value(row) }));
}

/**
 * Why a write did not land.
 *
 * A rejection needs none: "Not applied" beside the mark already says it, and
 * a sentence repeating it would be a fold that opens onto nothing new.
 */
const writeNote = (row: AgentMessage): string | undefined =>
  row.tool_state === "failed"
    ? row.content ||
      "This space changed after the agent read it, so September did not overwrite it. Ask again to work from what is there now."
    : undefined;

/** The mark on a proposal card says what kind of change is waiting. */
function proposalIcon(row: AgentMessage): typeof Check {
  if (agentProposalIsDelete(row)) return Trash2;
  if (!row.tool_name || !row.tool_arguments) return Pencil;
  const input = parseAgentToolArguments(row.tool_name, row.tool_arguments) as {
    operation?: string;
    pinned?: boolean;
  };
  if (input.operation === "pin" || input.operation === "unpin") return Pin;
  if (input.operation === "create") return input.pinned ? Pin : Plus;
  return Pencil;
}

/**
 * A change waiting for a press. The only card on the screen.
 *
 * It shows what it would replace beside what it would write, so approving
 * does not mean opening another screen to compare.
 */
export function ProposalCard({
  row,
  space,
  busy,
  onApprove,
  onReject,
  destructive,
}: {
  row: AgentMessage;
  /** What the space holds now, so a change can show what it replaces. */
  space?: { title?: string | null; context?: string | null };
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  destructive: boolean;
}) {
  if (!row.tool_name || !row.tool_arguments) return null;
  const lines = agentProposalLines(row, space);
  const Icon = proposalIcon(row);

  return (
    <section
      className={`bg-card overflow-hidden rounded-2xl border shadow-sm ${
        destructive ? "border-destructive/30" : "border-primary/25"
      }`}
    >
      <div className="flex items-start gap-3 p-4 pb-0">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${
            destructive
              ? "bg-red-50 text-destructive"
              : "bg-accent text-accent-foreground"
          }`}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {agentToolSummary(row.tool_name, row.tool_arguments)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {destructive
              ? "You cannot undo this."
              : "Waiting for you. Nothing has changed yet."}
          </p>
        </div>
      </div>

      {lines.length ? <Preview lines={lines} /> : null}

      {agentProposalIsUnpin(row) ? (
        <p className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-700">
          Unpinning lets later phrase generation replace this phrase.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2.5 p-4">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          aria-disabled={busy}
          onClick={() => !busy && onReject()}
        >
          <X aria-hidden />
          {destructive ? "Keep it" : "Reject"}
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "default"}
          className="min-h-11"
          aria-disabled={busy}
          onClick={() => !busy && onApprove()}
        >
          {destructive ? <Trash2 aria-hidden /> : <Check aria-hidden />}
          {destructive ? "Delete…" : "Approve"}
        </Button>
      </div>
    </section>
  );
}

/** What the change would write, beside what it would replace. */
function Preview({ lines }: { lines: readonly AgentChangeLine[] }) {
  return (
    <div className="mx-4 mt-3.5 overflow-hidden rounded-xl border text-sm">
      {lines.map((line, at) => (
        <div
          key={at}
          className={`grid grid-cols-[4rem_1fr] items-baseline gap-3 px-3 py-2.5 ${
            at > 0 ? "border-t" : ""
          } ${line.was ? "bg-muted/50" : ""}`}
        >
          <span className="text-muted-foreground/70 truncate text-xs font-bold tracking-wider uppercase">
            {line.label}
          </span>
          <span
            className={`min-w-0 break-words ${
              line.was
                ? "text-muted-foreground line-through decoration-zinc-300"
                : "font-medium"
            }`}
          >
            {line.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The words of the user. The loud thing on the screen. */
function UserTurn({ text }: { text: string }) {
  return (
    <p className="bg-primary text-primary-foreground ml-auto max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 text-base leading-relaxed whitespace-pre-wrap">
      {text}
    </p>
  );
}

/**
 * The turn the agent takes in answer: what it did, then what it says.
 *
 * The reply is prose on the surface rather than a second bubble. The agent is
 * the app answering a question about this space, not another person in the
 * conversation, and a long answer reads badly in a balloon. The work sits in
 * the reply's gutter, behind a rail, because it is a footnote to the answer.
 */
function ReplyTurn({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] items-start gap-2.5">
      <span className="bg-accent text-accent-foreground mt-px grid size-7 place-items-center rounded-full">
        <AgentLetter />
      </span>
      <div className="col-start-2 flex min-w-0 flex-col">{children}</div>
    </div>
  );
}

/**
 * The mark the agent signs with: September's own letter, in the brand face.
 *
 * The agent is this app answering a question about this space — not a person,
 * and not a robot. A borrowed glyph said it was one of those.
 */
export function AgentLetter({ className = "text-sm" }: { className?: string }) {
  return (
    <span className={`font-brand font-bold leading-none ${className}`} aria-hidden>
      S
    </span>
  );
}

/** The rail that ties a run of work to the reply it produced. */
function Work({ children }: { children: ReactNode }) {
  return (
    <div className="border-border -ml-px flex flex-col border-l-2 pl-3.5">
      {children}
    </div>
  );
}

export function Transcript({
  rows,
  busy,
  partial,
  space,
  onApprove,
  onReject,
}: {
  rows: readonly AgentMessage[];
  busy: boolean;
  /** The words of an answer still being written, if any have arrived. */
  partial?: string;
  /** The current name and note, so a proposal can show what it replaces. */
  space?: { title?: string | null; context?: string | null };
  onApprove: (row: AgentMessage) => void;
  onReject: (row: AgentMessage) => void;
}) {
  /** One folded line, or the card that a waiting change earns instead. */
  const draw = (part: AgentTurnPart) => {
    if (part.kind === "run") {
      const [first, ...rest] = part.rows;
      const outcome = agentToolOutcome(first);
      return (
        <ToolLine
          key={first.id}
          tone={outcome.tone}
          title={nameOf(first)}
          label={rest.length ? `and ${rest.length} more` : outcome.label}
          pairs={runPairs(part.rows)}
        />
      );
    }

    if (part.kind === "text") {
      return (
        <p
          key={part.row.id}
          className="py-2 text-base leading-relaxed whitespace-pre-wrap"
        >
          {part.row.content}
        </p>
      );
    }

    const row = part.row;
    if (row.tool_state === "pending") {
      return (
        <div key={row.id} className="py-2">
          <ProposalCard
            row={row}
            space={space}
            busy={busy}
            destructive={agentProposalIsDelete(row)}
            onApprove={() => onApprove(row)}
            onReject={() => onReject(row)}
          />
        </div>
      );
    }

    const outcome = agentToolOutcome(row);
    return (
      <ToolLine
        key={row.id}
        tone={outcome.tone}
        title={nameOf(row)}
        label={outcome.label}
        pairs={agentProposalLines(row).slice(0, 1)}
        note={writeNote(row)}
      />
    );
  };

  return (
    <>
      {groupAgentTurns(rows).map((turn) =>
        turn.role === "user" && turn.parts[0].kind === "text" ? (
          <UserTurn key={turn.id} text={turn.parts[0].row.content} />
        ) : (
          <ReplyTurn key={turn.id}>
            {railed(turn.parts).map((group, at) =>
              isLine(group[0]) ? (
                <Work key={at}>{group.map(draw)}</Work>
              ) : (
                <div key={at}>{group.map(draw)}</div>
              ),
            )}
          </ReplyTurn>
        ),
      )}
      {busy && partial?.trim() ? (
        // Hidden from the reader of the screen on purpose. The stored row is
        // announced once it lands; reading an answer a word at a time would
        // talk over the user for as long as the model keeps writing.
        <ReplyTurn>
          <p
            aria-hidden
            className="py-2 text-base leading-relaxed whitespace-pre-wrap"
          >
            {partial}
          </p>
        </ReplyTurn>
      ) : busy ? (
        <p className="text-muted-foreground pl-10 text-sm" role="status">
          Working…
        </p>
      ) : null}
    </>
  );
}

/** A part that draws as a line in the rail, rather than as its own block. */
const isLine = (part: AgentTurnPart): boolean =>
  part.kind === "run" ||
  (part.kind === "write" && part.row.tool_state !== "pending");

/**
 * The parts of a turn, with runs of work gathered behind one rail.
 *
 * The rail belongs to the work and not to the answer: a reply drawn inside it
 * would read as another thing the agent did, rather than the thing it said.
 */
function railed(parts: readonly AgentTurnPart[]): AgentTurnPart[][] {
  const groups: AgentTurnPart[][] = [];
  for (const part of parts) {
    const open = groups.at(-1);
    if (isLine(part) && open && isLine(open[0])) open.push(part);
    else groups.push([part]);
  }
  return groups;
}

/**
 * Openers that put words in the field.
 *
 * `write` pushes the composer's undo stack and puts the focus back, so a
 * press is undoable and nothing unmounts under the hand that made it.
 */
export function Openers({
  openers,
  onTake,
}: {
  openers: readonly string[];
  onTake: (opener: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {openers.map((opener) => (
        <button
          key={opener}
          type="button"
          onClick={() => onTake(opener)}
          className="border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex h-11 items-center gap-1.5 rounded-full border px-5 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {opener.trim()}
          <span className="text-muted-foreground" aria-hidden>
            …
          </span>
        </button>
      ))}
    </div>
  );
}

/** The invitation a transcript shows before it holds anything. */
export function TranscriptEmpty({
  icon,
  title,
  children,
  openers,
  onOpener,
  footer,
}: {
  /** Drawn, not named: the agent's mark is a letter, not a glyph. */
  icon: ReactNode;
  title: string;
  children: ReactNode;
  openers?: readonly string[];
  onOpener?: (opener: string) => void;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="bg-accent text-accent-foreground grid size-12 place-items-center rounded-full">
        {icon}
      </div>
      <h2 className="text-title font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        {children}
      </p>
      {openers && onOpener ? (
        <Openers openers={openers} onTake={onOpener} />
      ) : null}
      {footer}
    </div>
  );
}
