/** How the Agent transcript of a space reads on a screen. */

import type { AgentMessage } from "../records.ts";
import {
  callOperation,
  isAgentWriteTool,
  jsonObject,
  readAgentCall,
  type AgentCall,
  type AgentToolName,
} from "./tools.ts";

/** Openers for the Agent console. A press on one costs no keystrokes. */
export const AGENT_OPENERS: readonly string[] = [
  "Add a phrase for ",
  "Tidy my note ",
  "What do I say most ",
];

export type AgentToolTone =
  | "read"
  | "applied"
  | "rejected"
  | "failed"
  | "pending";

export interface AgentToolOutcome {
  tone: AgentToolTone;
  /** The word beside the mark. Colour is never the only signal. */
  label: string;
}

/** What became of one tool row. A read that ran is not a change that landed. */
export function agentToolOutcome(row: AgentMessage): AgentToolOutcome {
  if (row.tool_state === "pending")
    return { tone: "pending", label: "Waiting for you" };
  if (row.tool_state === "rejected")
    return { tone: "rejected", label: "Not applied" };
  if (row.tool_state === "failed")
    return { tone: "failed", label: "Could not apply" };
  const write = row.tool_name ? isAgentWriteTool(row.tool_name) : false;
  return write
    ? { tone: "applied", label: "Applied" }
    : { tone: "read", label: "Read" };
}

/**
 * One piece of a turn.
 *
 * Tools that ran one after another with the same outcome are one piece. A
 * change that waits for a press is always its own piece, and so is one that
 * failed, because it carries its own reason.
 */
export type AgentTurnPart =
  | { kind: "text"; row: AgentMessage }
  | { kind: "run"; rows: AgentMessage[] }
  | { kind: "write"; row: AgentMessage };

export interface AgentTurn {
  /** The first row of the turn. The screen keys on it. */
  id: string;
  role: "user" | "assistant";
  parts: AgentTurnPart[];
}

/** Only a settled read or a landed change joins the row before it. */
const joins = (row: AgentMessage): boolean => {
  const { tone } = agentToolOutcome(row);
  return tone === "read" || tone === "applied";
};

/**
 * The flat transcript as turns.
 *
 * Every user message opens a turn. Everything the agent did in answer belongs
 * to the one turn after it.
 */
export function groupAgentTurns(rows: readonly AgentMessage[]): AgentTurn[] {
  const turns: AgentTurn[] = [];

  const add = (row: AgentMessage, part: AgentTurnPart) => {
    const open = turns[turns.length - 1];
    if (open && open.role === "assistant") open.parts.push(part);
    else turns.push({ id: row.id, role: "assistant", parts: [part] });
  };

  for (const row of rows) {
    if (row.role === "user") {
      turns.push({ id: row.id, role: "user", parts: [{ kind: "text", row }] });
      continue;
    }

    if (row.role === "assistant") {
      // The loop stores an assistant row for a step that only called a tool.
      if (row.content.trim()) add(row, { kind: "text", row });
      continue;
    }

    if (!joins(row)) {
      add(row, { kind: "write", row });
      continue;
    }

    const open = turns[turns.length - 1];
    const last = open?.role === "assistant" ? open.parts.at(-1) : undefined;
    const sameOutcome =
      last?.kind === "run" &&
      agentToolOutcome(last.rows[0]).tone === agentToolOutcome(row).tone;
    if (last?.kind === "run" && sameOutcome) last.rows.push(row);
    else add(row, { kind: "run", rows: [row] });
  }

  return turns;
}

/** The call a tool row holds, or the reason it holds none. */
export function agentRowCall(
  row: AgentMessage,
): { ok: true; call: AgentCall } | { ok: false; error: string } {
  if (!row.tool_name || row.tool_arguments === undefined)
    return { ok: false, error: "This row holds no tool call." };
  return readAgentCall(row.tool_name, row.tool_arguments);
}

const capitalize = (value: string) =>
  value.slice(0, 1).toUpperCase() + value.slice(1);

const OPERATIONS: readonly string[] = [
  "create",
  "append",
  "replace",
  "rename",
  "edit",
  "pin",
  "unpin",
  "delete",
];

/** The operation that arguments name, even when the rest is not valid. */
function statedOperation(raw: string): string | undefined {
  try {
    const { operation } = jsonObject(raw, "Arguments");
    return typeof operation === "string" && OPERATIONS.includes(operation)
      ? operation
      : undefined;
  } catch {
    return undefined;
  }
}

/** The name of a call, for a card or a folded line. */
export function agentToolSummary(name: AgentToolName, raw: string): string {
  if (name === "configure_space") return "Change this space";
  if (name === "read_note") return "Read note";
  if (name === "read_talk_messages" || name === "inspect_space")
    return "Read this space";
  const read = readAgentCall(name, raw);
  const action =
    (read.ok ? callOperation(read.call) : statedOperation(raw)) ?? "change";
  if (name === "change_note") return `${capitalize(action)} note`;
  if (name === "change_phrase") return `${capitalize(action)} phrase`;
  return `${capitalize(action)} Talk message`;
}

/** One line of a proposal preview. `was` marks the state being replaced. */
export interface AgentChangeLine {
  label: string;
  value: string;
  was?: boolean;
}

const PINNED_YES = "Yes — generation will keep it";
const PINNED_NO = "No — generation can replace it";

const pair = (
  now: string | undefined,
  next: string,
  label: string,
): AgentChangeLine[] =>
  now === undefined
    ? [{ label, value: next }]
    : [
        { label: "Now", value: now, was: true },
        { label: "After", value: next },
      ];

/**
 * What a write does, in the words of the space.
 *
 * `configure_space` changes the space itself, so the screen passes what the
 * space holds now. A call that is not valid shows its reason.
 */
export function agentProposalLines(
  row: AgentMessage,
  space?: { title?: string | null; context?: string | null },
): AgentChangeLine[] {
  if (!row.tool_name || row.tool_arguments === undefined) return [];
  const read = agentRowCall(row);
  if (!read.ok) return [{ label: "Not valid", value: read.error }];
  const call = read.call;

  if (call.tool === "configure_space") {
    const { title, context } = call;
    if (title && context)
      return [
        { label: "Name", value: title },
        { label: "Note", value: context },
      ];
    if (title) return pair(space?.title ?? undefined, title, "Name");
    if (context) return pair(space?.context ?? undefined, context, "Note");
    return [];
  }

  if (call.tool === "change_note") {
    const { operation, name, text } = call;
    if (operation === "delete") return [];
    if (operation === "rename")
      return name === undefined ? [] : [{ label: "New name", value: name }];
    if (operation === "create")
      return [
        ...(name ? [{ label: "Name", value: name }] : []),
        ...(text ? [{ label: "Text", value: text }] : []),
      ];
    if (text === undefined) return [];
    return operation === "append"
      ? [{ label: "Add to note", value: text }]
      : [{ label: "New text", value: text }];
  }

  if (call.tool === "change_phrase") {
    const { operation, text } = call;
    if (operation === "pin") return [{ label: "Pinned", value: PINNED_YES }];
    if (operation === "unpin") return [{ label: "Pinned", value: PINNED_NO }];
    if (operation === "delete" || text === undefined) return [];
    return operation === "create"
      ? [
          { label: "Phrase", value: text },
          { label: "Pinned", value: call.pinned === true ? PINNED_YES : "No" },
        ]
      : [{ label: "Phrase", value: text }];
  }

  if (call.tool === "change_talk_message") {
    // This tool checks the words it read, so it can show what it replaces.
    const { operation, text, expected_text: seen } = call;
    if (operation === "delete")
      return seen === undefined ? [] : [{ label: "Message", value: seen }];
    if (text === undefined) return [];
    return operation === "create"
      ? [{ label: "Message", value: text }]
      : pair(seen, text, "Message");
  }

  return [];
}

const proposalOperation = (row: AgentMessage): string | undefined => {
  const read = agentRowCall(row);
  return read.ok ? callOperation(read.call) : undefined;
};

/** A delete cannot be undone, so the screen asks a second time. */
export const agentProposalIsDelete = (row: AgentMessage): boolean =>
  proposalOperation(row) === "delete";

/** An unpin can be undone by pinning again, but generation may act first. */
export const agentProposalIsUnpin = (row: AgentMessage): boolean =>
  proposalOperation(row) === "unpin";

/** `n thing` or `n things`, or nothing when there are none. */
const count = (n: number, one: string, many = `${one}s`): string =>
  n > 0 ? `${n} ${n === 1 ? one : many}` : "";

const listSize = (value: unknown): number =>
  Array.isArray(value) ? value.length : 0;

/**
 * What a tool found, in words.
 *
 * A tool result is JSON for the model. A person wants one sentence. A result
 * that is not a JSON object says nothing.
 */
export function agentToolResult(row: AgentMessage): string {
  let found: Record<string, unknown>;
  try {
    found = jsonObject(row.content, "A tool result");
  } catch {
    return "";
  }

  if (row.tool_name === "inspect_space") {
    return [
      count(listSize(found.notes), "note"),
      count(listSize(found.phrases), "phrase"),
      count(listSize(found.recent_talk_messages), "recent message"),
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (row.tool_name === "read_note") {
    const name = typeof found.name === "string" ? found.name : "";
    const read = count(
      typeof found.content === "string" ? found.content.length : 0,
      "character",
    );
    const more = found.has_more ? ", and more to read" : "";
    return [name, read && `${read}${more}`].filter(Boolean).join(" — ");
  }

  if (row.tool_name === "read_talk_messages") {
    const read = count(listSize(found.messages), "message");
    return read && `${read}${found.has_more ? ", and older ones" : ""}`;
  }

  return found.ok === true ? "Done." : "";
}
