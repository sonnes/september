/** The agent that belongs to one open space: its contract, and its turn. */

import type { Agent, AgentTool } from "@earendil-works/pi-agent-core";
import type {
  Api,
  AssistantMessage,
  Model,
  TSchema,
} from "@earendil-works/pi-ai";
import type { StreamFn } from "@earendil-works/pi-agent-core";

import { appendToNote } from "./notes.ts";
import { generateCode, type SavedPhrase } from "./phrases.ts";
import { freeTitle } from "./spaces.ts";

export const AGENT_HISTORY_LIMIT = 40;
export const AGENT_NOTE_CHUNK_LIMIT = 8_000;
export const AGENT_TALK_PAGE_LIMIT = 100;
export const AGENT_TEXT_LIMIT = 10_000;

export type AgentRole = "user" | "assistant" | "tool";
export type AgentToolState = "pending" | "applied" | "rejected" | "failed";

/** One durable row in the agent-only transcript. */
export interface AgentMessage {
  id: string;
  space_id: string;
  role: AgentRole;
  content: string;
  tool_call_id?: string;
  tool_name?: AgentToolName;
  tool_arguments?: string;
  tool_state?: AgentToolState;
  created_at: number;
  updated_at: number;
}

export type AgentToolName =
  | "inspect_space"
  | "read_note"
  | "read_talk_messages"
  | "configure_space"
  | "change_note"
  | "change_phrase"
  | "change_talk_message";

export interface AgentToolDefinition {
  type: "function";
  function: {
    name: AgentToolName;
    description: string;
    strict: true;
    parameters: Record<string, unknown>;
  };
}

const objectSchema = (
  properties: Record<string, unknown>,
  required: readonly string[],
): Record<string, unknown> => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const nullableText = (description: string) => ({
  type: ["string", "null"],
  description,
});
const nullableInteger = (description: string) => ({
  type: ["integer", "null"],
  minimum: 0,
  description,
});

/** Strict function definitions sent to a tool-capable writing model. */
export const AGENT_TOOL_DEFINITIONS: readonly AgentToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "inspect_space",
      description:
        "Read the open space, its note list, saved phrases, and recent Talk messages.",
      strict: true,
      parameters: objectSchema({}, []),
    },
  },
  {
    type: "function",
    function: {
      name: "read_note",
      description: "Read a bounded chunk of one note in the open space.",
      strict: true,
      parameters: objectSchema(
        {
          note_id: {
            type: "string",
            description: "A note ID returned by inspect_space.",
          },
          offset: { type: ["integer", "null"], minimum: 0 },
          limit: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: AGENT_NOTE_CHUNK_LIMIT,
          },
        },
        ["note_id", "offset", "limit"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "read_talk_messages",
      description:
        "Read user-authored Talk messages from the open space, newest page first.",
      strict: true,
      parameters: objectSchema(
        {
          before_id: nullableText(
            "Return messages older than this message ID.",
          ),
          limit: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: AGENT_TALK_PAGE_LIMIT,
          },
        },
        ["before_id", "limit"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "configure_space",
      description: "Change the open space name or description.",
      strict: true,
      parameters: objectSchema(
        {
          title: nullableText("The new space name, or null to keep it."),
          context: nullableText("The new description, or null to keep it."),
          expected_updated_at: nullableInteger(
            "The version returned by inspect_space.",
          ),
        },
        ["title", "context", "expected_updated_at"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "change_note",
      description:
        "Create, append to, replace, rename, or delete a note in the open space. A delete waits for the user to approve it; nothing else does.",
      strict: true,
      parameters: objectSchema(
        {
          operation: {
            type: "string",
            enum: ["create", "append", "replace", "rename", "delete"],
          },
          note_id: nullableText("The existing note ID, or null when creating."),
          name: nullableText(
            "A note name for create or rename, otherwise null.",
          ),
          text: nullableText(
            "Content for create, append, or replace, otherwise null.",
          ),
          expected_updated_at: nullableInteger(
            "The existing note version, or null when creating.",
          ),
        },
        ["operation", "note_id", "name", "text", "expected_updated_at"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "change_phrase",
      description:
        "Create, edit, pin, unpin, or delete a saved phrase or sentence starter in the open space. A delete waits for the user to approve it; nothing else does.",
      strict: true,
      parameters: objectSchema(
        {
          operation: {
            type: "string",
            enum: ["create", "edit", "pin", "unpin", "delete"],
          },
          phrase_id: nullableText(
            "The existing phrase ID, or null when creating.",
          ),
          text: nullableText(
            "The phrase text for create or edit, otherwise null.",
          ),
          kind: { type: ["string", "null"], enum: ["phrase", "starter", null] },
          pinned: {
            type: ["boolean", "null"],
            description: "Initial pin state when creating.",
          },
          expected_updated_at: nullableInteger(
            "The existing phrase version, or null when creating.",
          ),
        },
        [
          "operation",
          "phrase_id",
          "text",
          "kind",
          "pinned",
          "expected_updated_at",
        ],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "change_talk_message",
      description:
        "Create, edit, or delete a user-authored Talk transcript message in the open space. This never speaks it. A delete waits for the user to approve it; nothing else does.",
      strict: true,
      parameters: objectSchema(
        {
          operation: { type: "string", enum: ["create", "edit", "delete"] },
          message_id: nullableText(
            "The existing message ID, or null when creating.",
          ),
          text: nullableText(
            "The message text for create or edit, otherwise null.",
          ),
          expected_text: nullableText(
            "The current text returned by a read, or null when creating.",
          ),
          expected_created_at: nullableInteger(
            "The current timestamp returned by a read, or null when creating.",
          ),
        },
        [
          "operation",
          "message_id",
          "text",
          "expected_text",
          "expected_created_at",
        ],
      ),
    },
  },
] as const;

export type AgentToolArguments =
  | { tool: "inspect_space" }
  | { tool: "read_note"; note_id: string; offset: number; limit: number }
  | { tool: "read_talk_messages"; before_id?: string; limit: number }
  | {
      tool: "configure_space";
      title?: string;
      context?: string;
      expected_updated_at?: number;
    }
  | {
      tool: "change_note";
      operation: "create" | "append" | "replace" | "rename" | "delete";
      note_id?: string;
      name?: string;
      text?: string;
      expected_updated_at?: number;
    }
  | {
      tool: "change_phrase";
      operation: "create" | "edit" | "pin" | "unpin" | "delete";
      phrase_id?: string;
      text?: string;
      kind?: "phrase" | "starter";
      pinned?: boolean;
      expected_updated_at?: number;
    }
  | {
      tool: "change_talk_message";
      operation: "create" | "edit" | "delete";
      message_id?: string;
      text?: string;
      expected_text?: string;
      expected_created_at?: number;
    };

const READ_TOOLS = new Set<AgentToolName>([
  "inspect_space",
  "read_note",
  "read_talk_messages",
]);

export const isAgentToolName = (value: string): value is AgentToolName =>
  AGENT_TOOL_DEFINITIONS.some((tool) => tool.function.name === value);

/** Whether a tool changes the space rather than only reading it. */
export const isAgentWriteTool = (name: AgentToolName): boolean =>
  !READ_TOOLS.has(name);

/**
 * The operation a call was made with, if its tool names one.
 *
 * Arguments the model mangled have no operation. Nothing here throws: a call
 * this cannot read is one the executor will refuse with a reason the model
 * can act on, and that is a better answer than a card the user cannot help.
 */
const callOperation = (
  name: AgentToolName,
  args: string,
): string | undefined => {
  try {
    const input = parseAgentToolArguments(name, args) as Record<string, unknown>;
    return typeof input.operation === "string" ? input.operation : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Whether a call must wait for a press before it runs.
 *
 * Only a delete does. Everything else the agent writes is visible in the
 * space the moment it lands and can be changed again by asking, so a press
 * for each one buys nothing and costs the keystrokes this app exists to save.
 * A delete is the one act with nothing left to look at afterwards.
 */
export const agentCallNeedsApproval = (
  name: AgentToolName,
  args: string,
): boolean => isAgentWriteTool(name) && callOperation(name, args) === "delete";

function inputObject(raw: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Tool arguments must be valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Tool arguments must be an object.");
  }
  return value as Record<string, unknown>;
}

function allowed(row: Record<string, unknown>, keys: readonly string[]): void {
  const unexpected = Object.keys(row).find((key) => !keys.includes(key));
  if (unexpected)
    throw new Error(`${unexpected} is not allowed for this tool.`);
}

function requiredText(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${key} must be text.`);
  const text = value.trim();
  if (text.length > AGENT_TEXT_LIMIT) throw new Error(`${key} is too long.`);
  return text;
}

function optionalText(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  return row[key] === undefined || row[key] === null
    ? undefined
    : requiredText(row, key);
}

function optionalInteger(
  row: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = row[key];
  if (value === undefined || value === null) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${key} must be a nonnegative integer.`);
  }
  return value as number;
}

function operation<T extends string>(
  row: Record<string, unknown>,
  choices: readonly T[],
): T {
  if (
    typeof row.operation !== "string" ||
    !choices.includes(row.operation as T)
  ) {
    throw new Error("operation is not supported.");
  }
  return row.operation as T;
}

/** Parse and validate untrusted model arguments before any repository call. */
export function parseAgentToolArguments(
  name: AgentToolName,
  raw: string,
): Omit<AgentToolArguments, "tool"> {
  const row = inputObject(raw);

  if (name === "inspect_space") {
    allowed(row, []);
    return {};
  }
  if (name === "read_note") {
    allowed(row, ["note_id", "offset", "limit"]);
    const offset = optionalInteger(row, "offset") ?? 0;
    const limit = optionalInteger(row, "limit") ?? AGENT_NOTE_CHUNK_LIMIT;
    if (limit < 1 || limit > AGENT_NOTE_CHUNK_LIMIT)
      throw new Error("limit is out of range.");
    return { note_id: requiredText(row, "note_id"), offset, limit };
  }
  if (name === "read_talk_messages") {
    allowed(row, ["before_id", "limit"]);
    const limit = optionalInteger(row, "limit") ?? 20;
    if (limit < 1 || limit > AGENT_TALK_PAGE_LIMIT)
      throw new Error("limit is out of range.");
    return { ...optional("before_id", optionalText(row, "before_id")), limit };
  }
  if (name === "configure_space") {
    allowed(row, ["title", "context", "expected_updated_at"]);
    const title = optionalText(row, "title");
    const context = optionalText(row, "context");
    if (title === undefined && context === undefined)
      throw new Error("A title or context is required.");
    return {
      ...optional("title", title),
      ...optional("context", context),
      ...optional(
        "expected_updated_at",
        optionalInteger(row, "expected_updated_at"),
      ),
    };
  }
  if (name === "change_note") {
    allowed(row, [
      "operation",
      "note_id",
      "name",
      "text",
      "expected_updated_at",
    ]);
    const op = operation(row, [
      "create",
      "append",
      "replace",
      "rename",
      "delete",
    ] as const);
    const note_id = optionalText(row, "note_id");
    const nameValue = optionalText(row, "name");
    const text = optionalText(row, "text");
    if (op !== "create" && !note_id) throw new Error("note_id is required.");
    if ((op === "append" || op === "replace") && text === undefined)
      throw new Error("text is required.");
    if (op === "rename" && nameValue === undefined)
      throw new Error("name is required.");
    return {
      operation: op,
      ...optional("note_id", note_id),
      ...optional("name", nameValue),
      ...optional("text", text),
      ...optional(
        "expected_updated_at",
        optionalInteger(row, "expected_updated_at"),
      ),
    };
  }
  if (name === "change_phrase") {
    allowed(row, [
      "operation",
      "phrase_id",
      "text",
      "kind",
      "pinned",
      "expected_updated_at",
    ]);
    const op = operation(row, [
      "create",
      "edit",
      "pin",
      "unpin",
      "delete",
    ] as const);
    const phrase_id = optionalText(row, "phrase_id");
    const text = optionalText(row, "text");
    if (op !== "create" && !phrase_id)
      throw new Error("phrase_id is required.");
    if ((op === "create" || op === "edit") && text === undefined)
      throw new Error("text is required.");
    const kind =
      row.kind === undefined || row.kind === null
        ? undefined
        : row.kind === "phrase" || row.kind === "starter"
          ? row.kind
          : (() => {
              throw new Error("kind is not supported.");
            })();
    const pinned =
      row.pinned === undefined || row.pinned === null
        ? undefined
        : typeof row.pinned === "boolean"
          ? row.pinned
          : (() => {
              throw new Error("pinned must be true or false.");
            })();
    return {
      operation: op,
      ...optional("phrase_id", phrase_id),
      ...optional("text", text),
      ...optional("kind", kind),
      ...optional("pinned", pinned),
      ...optional(
        "expected_updated_at",
        optionalInteger(row, "expected_updated_at"),
      ),
    };
  }

  allowed(row, [
    "operation",
    "message_id",
    "text",
    "expected_text",
    "expected_created_at",
  ]);
  const op = operation(row, ["create", "edit", "delete"] as const);
  const message_id = optionalText(row, "message_id");
  const text = optionalText(row, "text");
  if (op !== "create" && !message_id)
    throw new Error("message_id is required.");
  if ((op === "create" || op === "edit") && text === undefined)
    throw new Error("text is required.");
  return {
    operation: op,
    ...optional("message_id", message_id),
    ...optional("text", text),
    ...optional("expected_text", optionalText(row, "expected_text")),
    ...optional(
      "expected_created_at",
      optionalInteger(row, "expected_created_at"),
    ),
  };
}

function optional<K extends string, T>(
  key: K,
  value: T | undefined,
): { [P in K]?: T } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]: T });
}

/** Short text for an approval card. */
export function agentToolSummary(name: AgentToolName, raw: string): string {
  const input = parseAgentToolArguments(name, raw) as Record<string, unknown>;
  if (name === "configure_space") return "Change this space";
  const action =
    typeof input.operation === "string" ? input.operation : "change";
  if (name === "change_note") return `${capitalize(action)} note`;
  if (name === "change_phrase") return `${capitalize(action)} phrase`;
  if (name === "change_talk_message")
    return `${capitalize(action)} Talk message`;
  return name === "read_note" ? "Read note" : "Read this space";
}

const capitalize = (value: string) =>
  value.slice(0, 1).toUpperCase() + value.slice(1);

// ------------------------------------------------------ reading a transcript

/**
 * Openers for the Agent console, the way `NEW_SPACE_OPENERS` opens a space.
 *
 * A user who types slowly should not have to compose their first sentence
 * from nothing. An example you can press costs no keystrokes; one you have to
 * retype costs all of them.
 */
export const AGENT_OPENERS: readonly string[] = [
  "Add a phrase for ",
  "Tidy my note ",
  "What do I say most ",
];

/** How a tool row reads once the user is looking at it. */
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
 * Tools that ran one after another with the same outcome are one piece: a
 * user asked one question, and the reads behind the answer — or the phrases
 * written into a new space — are one act, not six. A change still waiting for
 * a press is always its own piece, and so is one that failed, because it
 * carries a reason of its own.
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

/**
 * Whether a row joins the row before it.
 *
 * Only a settled read or a landed change does. The word beside the mark
 * stands for the whole group, so a group may hold one outcome and no other.
 */
const joins = (row: AgentMessage): boolean => {
  const { tone } = agentToolOutcome(row);
  return tone === "read" || tone === "applied";
};

/**
 * The flat transcript as turns the screen can draw.
 *
 * Every user message opens a turn. Everything the agent did in answer — its
 * reads, its proposals, and its words — belongs to the one turn after it.
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
      // The loop persists an assistant row for a step that only called a
      // tool. It has no words, so it has nothing to draw.
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

/** One line of a proposal preview. `was` is the state being replaced. */
export interface AgentChangeLine {
  label: string;
  value: string;
  was?: boolean;
}

const PINNED_YES = "Yes — generation will keep it";
const PINNED_NO = "No — generation can replace it";

/**
 * One field, shown as a replacement when the screen knows what is there now.
 *
 * A user approving a change should see what it is replacing, not only what it
 * would write.
 */
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
 * What a pending write would do, in the words of the space rather than the
 * words of the tool.
 *
 * Only `change_talk_message` carries what it is replacing, because only it
 * checks the old text. `configure_space` changes the space itself, so the
 * screen passes what the space holds now.
 *
 * ponytail: notes, phrases, and Talk rows are named by ID, so a card for one
 * shows only what would be written. Pass their current text here if a screen
 * ever holds it.
 */
export function agentProposalLines(
  row: AgentMessage,
  space?: { title?: string | null; context?: string | null },
): AgentChangeLine[] {
  if (!row.tool_name || !row.tool_arguments) return [];
  const input = parseAgentToolArguments(
    row.tool_name,
    row.tool_arguments,
  ) as Record<string, unknown>;

  const words = (key: string): string | undefined =>
    typeof input[key] === "string" ? (input[key] as string) : undefined;
  const text = words("text");
  const name = words("name");
  const operation = words("operation");
  if (row.tool_name === "configure_space") {
    const title = words("title");
    const context = words("context");
    if (title && context)
      return [
        { label: "Name", value: title },
        { label: "Note", value: context },
      ];
    if (title) return pair(space?.title ?? undefined, title, "Name");
    if (context) return pair(space?.context ?? undefined, context, "Note");
    return [];
  }

  if (row.tool_name === "change_note") {
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

  if (row.tool_name === "change_phrase") {
    if (operation === "pin") return [{ label: "Pinned", value: PINNED_YES }];
    if (operation === "unpin") return [{ label: "Pinned", value: PINNED_NO }];
    if (operation === "delete") return [];
    if (text === undefined) return [];
    return operation === "create"
      ? [
          { label: "Phrase", value: text },
          { label: "Pinned", value: input.pinned === true ? PINNED_YES : "No" },
        ]
      : [{ label: "Phrase", value: text }];
  }

  if (row.tool_name === "change_talk_message") {
    // This tool checks the words it read, so it is the one write that can
    // always show what it is replacing.
    const seen = words("expected_text");
    if (operation === "delete")
      return seen === undefined ? [] : [{ label: "Message", value: seen }];
    if (text === undefined) return [];
    return operation === "create"
      ? [{ label: "Message", value: text }]
      : pair(seen, text, "Message");
  }

  return [];
}

const proposalOperation = (row: AgentMessage): string | undefined =>
  row.tool_name && row.tool_arguments
    ? callOperation(row.tool_name, row.tool_arguments)
    : undefined;

/** A delete cannot be undone, so the screen asks a second time. */
export const agentProposalIsDelete = (row: AgentMessage): boolean =>
  proposalOperation(row) === "delete";

/** An unpin can be undone by pinning again, but generation may act first. */
export const agentProposalIsUnpin = (row: AgentMessage): boolean =>
  proposalOperation(row) === "unpin";

// -------------------------------------------------------- making a space

/**
 * How long the first turn of a space may run, and how long a reply may be
 * owed before a screen stops saying it is coming.
 *
 * It is one number because it is one thing: the introduction is a chain of
 * model calls, not one, and it always writes a reply. Past this, the work has
 * given up and no screen should promise an answer that is not coming.
 */
export const INTRODUCTION_WAIT_MS = 120_000;

/** `n thing` or `n things`, or nothing at all when there are none. */
const count = (n: number, one: string, many = `${one}s`): string =>
  n > 0 ? `${n} ${n === 1 ? one : many}` : "";

/**
 * What a tool found, in words.
 *
 * A tool result is JSON, because a model reads it. A person opening a folded
 * line is not reading JSON — they want to know what the agent saw before it
 * answered, and a payload printed raw tells them less than one sentence does.
 * A result this does not recognise says nothing at all.
 */
export function agentToolResult(row: AgentMessage): string {
  let found: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(row.content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return "";
    found = parsed as Record<string, unknown>;
  } catch {
    return "";
  }

  const size = (key: string): number =>
    Array.isArray(found[key]) ? (found[key] as unknown[]).length : 0;

  if (row.tool_name === "inspect_space") {
    return [
      count(size("notes"), "note"),
      count(size("phrases"), "phrase"),
      count(size("recent_talk_messages"), "recent message"),
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
    const read = count(size("messages"), "message");
    return read && `${read}${found.has_more ? ", and older ones" : ""}`;
  }

  return found.ok === true ? "Done." : "";
}

/**
 * One plain row of a conversation.
 *
 * An introduction is a user turn and a reply, exactly like every other turn.
 * It carries no tool name and no tool state. The rows that do carry one are
 * written by the loop, from tool calls that really happened.
 */
export function agentSaidRow(
  spaceId: string,
  role: "user" | "assistant",
  content: string,
  options: { now?: () => number; id?: () => string } = {},
): AgentMessage {
  const at = (options.now ?? defaultNow)();
  return {
    id: (options.id ?? defaultId)(),
    space_id: spaceId,
    role,
    content: content.trim(),
    created_at: at,
    updated_at: at,
  };
}

/**
 * Whether the agent still owes a reply to the newest turn.
 *
 * The screen that shows a transcript did not always start the work that
 * fills it: an introduction runs on past the screen that asked for it. An
 * owed reply is how any screen knows work is in flight.
 */
export function agentOwesReply(
  rows: readonly AgentMessage[],
  now: number,
): boolean {
  const last = rows.at(-1);
  return (
    last?.role === "user" && now - last.created_at < INTRODUCTION_WAIT_MS
  );
}

function providerRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`The writing service returned an invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

/**
 * The shapes a typed model client takes and returns.
 *
 * September declares them here instead of depending on the client, so the pure
 * rules keep no dependency of their own. A client whose fields drift from
 * these fails an application build, never this package.
 */
export interface ModelTextContent {
  type: "text";
  text: string;
}

export interface ModelToolCallContent {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export interface ModelUserMessage {
  role: "user";
  content: string;
  timestamp: number;
}

/** Every way a model can stop, in the words a typed client uses. */
export type ModelStopReason =
  | "stop"
  | "length"
  | "toolUse"
  | "error"
  | "aborted";

/**
 * The client names its own services and its own APIs, so the identity of a
 * row is whatever those names are. September carries them through rather
 * than keeping a second list that has to stay in step.
 */
export interface ModelAssistantMessage<
  TApi extends string = string,
  TProvider extends string = string,
> {
  role: "assistant";
  content: (ModelTextContent | ModelToolCallContent)[];
  api: TApi;
  provider: TProvider;
  model: string;
  usage: ModelUsage;
  stopReason: ModelStopReason;
  timestamp: number;
}

export interface ModelToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: ModelTextContent[];
  isError: boolean;
  timestamp: number;
}

export type ModelMessage<
  TApi extends string = string,
  TProvider extends string = string,
> =
  | ModelUserMessage
  | ModelAssistantMessage<TApi, TProvider>
  | ModelToolResultMessage;

/** Which client, which service, and which model a rebuilt row belongs to. */
export interface ModelIdentity<
  TApi extends string = string,
  TProvider extends string = string,
> {
  api: TApi;
  provider: TProvider;
  model: string;
}

export interface ModelContext<
  TApi extends string = string,
  TProvider extends string = string,
> {
  systemPrompt?: string;
  messages: ModelMessage<TApi, TProvider>[];
}

/** A rebuilt row spent nothing. Only the answer of a real call carries usage. */
const emptyModelUsage = (): ModelUsage => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});

/**
 * The arguments of a stored call, as an object.
 *
 * The string was validated before it was written, so a broken one is a broken
 * row and not a broken model. An empty object keeps the rest of the transcript
 * readable; the tool result beside it still says what happened.
 */
function toolArgumentObject(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * One history, in the shape a typed client takes.
 *
 * It carries no tools. A caller that wants the model to act adds them; a
 * caller that only wants words leaves them out.
 */
export function modelContextFrom<TApi extends string, TProvider extends string>(
  history: readonly AgentProviderMessage[],
  identity: ModelIdentity<TApi, TProvider>,
  options: { now?: () => number } = {},
): ModelContext<TApi, TProvider> {
  const at = (options.now ?? defaultNow)();
  const messages: ModelMessage<TApi, TProvider>[] = [];
  // A tool result must name its tool, and only the call before it knows.
  const names = new Map<string, string>();
  let systemPrompt: string | undefined;

  for (const row of history) {
    if (row.role === "system") {
      systemPrompt = row.content;
      continue;
    }
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content, timestamp: at });
      continue;
    }
    if (row.role === "tool") {
      messages.push({
        role: "toolResult",
        toolCallId: row.tool_call_id,
        toolName: names.get(row.tool_call_id) ?? "",
        content: [{ type: "text", text: row.content }],
        isError: false,
        timestamp: at,
      });
      continue;
    }

    if (row.role === "assistant") {
      const content: (ModelTextContent | ModelToolCallContent)[] = [];
      if (row.content) content.push({ type: "text", text: row.content });
      for (const call of row.tool_calls ?? []) {
        names.set(call.id, call.function.name);
        content.push({
          type: "toolCall",
          id: call.id,
          name: call.function.name,
          arguments: toolArgumentObject(call.function.arguments),
        });
      }
      messages.push({
        role: "assistant",
        content,
        api: identity.api,
        provider: identity.provider,
        model: identity.model,
        usage: emptyModelUsage(),
        stopReason: row.tool_calls?.length ? "toolUse" : "stop",
        timestamp: at,
      });
    }
  }

  return {
    ...(systemPrompt === undefined ? {} : { systemPrompt }),
    messages,
  };
}

/**
 * One finished message from a typed client, or the failure it carries.
 *
 * A typed client answers a failed request with a message that holds the
 * reason, where September throws. This is where the two meet.
 */
function modelAnswer(value: unknown): Record<string, unknown> {
  const message = providerRecord(value, "reply");
  if (message.stopReason === "aborted") {
    throw new Error("The request was stopped.");
  }
  if (message.stopReason === "error") {
    const detail =
      typeof message.errorMessage === "string" && message.errorMessage.trim()
        ? message.errorMessage.trim()
        : "The writing service did not answer.";
    throw new Error(detail);
  }
  return message;
}

const modelTextParts = (message: Record<string, unknown>): string =>
  (Array.isArray(message.content) ? message.content : [])
    .filter(
      (part): part is ModelTextContent =>
        !!part &&
        typeof part === "object" &&
        (part as ModelTextContent).type === "text" &&
        typeof (part as ModelTextContent).text === "string",
    )
    .map((part) => part.text)
    .join("");

/** The words of one finished message from a typed client. */
export function modelTextFrom(value: unknown): string {
  return modelTextParts(modelAnswer(value));
}

export interface AgentSpace {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  created_at: number;
  updated_at: number;
}

export interface AgentNote {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface AgentTalkMessage {
  id: string;
  space_id?: string;
  user_id: string;
  text: string;
  type: string;
  created_at: number;
}

export type AgentProviderMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; content: string; tool_call_id: string };

/**
 * The model a turn runs on, and the client that streams it.
 *
 * September owns the transcript and the tools; the application owns the
 * service, the key, and what a call cost. This is where the two meet.
 */
export interface AgentWriter {
  model: Model<Api>;
  stream: StreamFn;
  /** What one finished answer spent. */
  spent?: (message: AssistantMessage) => void;
}

/** Platform operations used by the shared, space-bound tool executor. */
export interface AgentRuntimeAdapter {
  openWriter(): Promise<AgentWriter>;
  listAgentMessages(spaceId: string): Promise<AgentMessage[]>;
  putAgentMessage(message: AgentMessage): Promise<AgentMessage>;
  updateAgentToolState(
    id: string,
    expected: AgentToolState,
    state: AgentToolState,
    content: string,
    updatedAt: number,
  ): Promise<AgentMessage>;
  listSpaces(userId: string): Promise<AgentSpace[]>;
  getSpace(id: string): Promise<AgentSpace | null>;
  patchSpace(patch: {
    id: string;
    title?: string;
    context?: string;
    reset_phrases_synced_count?: boolean;
    updated_at: number;
  }): Promise<AgentSpace>;
  listNotes(spaceId: string): Promise<AgentNote[]>;
  getNote(id: string): Promise<AgentNote | null>;
  putNote(note: AgentNote): Promise<AgentNote>;
  deleteNote(id: string): Promise<boolean>;
  listPhrases(spaceId?: string): Promise<SavedPhrase[]>;
  putPhrase(phrase: SavedPhrase): Promise<SavedPhrase>;
  deletePhrase(id: string): Promise<boolean>;
  listMessages(spaceId: string): Promise<AgentTalkMessage[]>;
  getMessage(id: string): Promise<AgentTalkMessage | null>;
  putMessage(message: AgentTalkMessage): Promise<AgentTalkMessage>;
  deleteMessage(id: string): Promise<boolean>;
}

export interface AgentRunOptions {
  now?: () => number;
  id?: () => string;
  signal?: AbortSignal;
  /**
   * The words of the answer being written, each time more of them arrive.
   *
   * Each call gives the whole answer so far, not the piece that just came, so
   * a screen sets what it shows and never has to join anything. A turn that
   * calls a tool starts the next answer over.
   */
  onPartial?: (text: string) => void;
  /**
   * The first turn of a brand-new space.
   *
   * It gets its own prompt: one that tells it to name the space and write its
   * first phrases straight away, rather than offering.
   */
  intro?: boolean;
}

/**
 * How many writes one turn may apply before it starts asking.
 *
 * A write no longer waits for a press, so nothing else would ever stop a
 * model that keeps writing. The budget is counted from the transcript rather
 * than carried along, because approving a change starts a fresh turn on the
 * same conversation; a flag would reset and let it write for ever.
 *
 * It is also what furnishes a new space: one call names it, and the rest are
 * its first phrases.
 */
export const AGENT_MAX_WRITES = 10;

const defaultId = () => crypto.randomUUID();
const defaultNow = () => Date.now();

const AGENT_SYSTEM_PROMPT = `You are the assistant inside one September communication space.
Help the user manage only the open space. Use tools to inspect facts instead of guessing.
Read tools and every change run immediately, except a delete: a delete becomes a proposal that the user must approve.
Never claim a write succeeded until its tool result says it did. Keep replies concise and literal.
Talk message changes edit the transcript only and never speak. You cannot access another space.`;

const INTRODUCTION_SYSTEM_PROMPT = `You are setting up one new September communication space, from what its user has just said the space is for.
September is an assistive communication app: its user types slowly, or cannot type at all, so every phrase you write saves them keystrokes.

Set the space up now, without asking:
1. Call inspect_space, to read the space and the version that a change to it must carry.
2. Call configure_space once, passing that version as expected_updated_at. Give it a short title of one or two words. For the context, keep the user's own words exactly as they wrote them at the top, then add a blank line and your own short description of who they speak to here and what about. Never write over their words.
3. Then call change_phrase once per phrase, with operation "create" and pinned true, for up to ${AGENT_MAX_WRITES - 1} phrases.

Write each phrase in the user's own voice, in the first person, under eight words, as something they would really say in this space. Do not number them and do not repeat one. Do not invent a phrase code: September writes those.
Make one tool call at a time. When the space is set up, reply in two short sentences saying what you called it and how many phrases you wrote.
You cannot access another space.`;

function providerHistory(
  rows: readonly AgentMessage[],
  intro?: boolean,
): AgentProviderMessage[] {
  const messages: AgentProviderMessage[] = [
    {
      role: "system",
      content: intro ? INTRODUCTION_SYSTEM_PROMPT : AGENT_SYSTEM_PROMPT,
    },
  ];
  for (const row of rows.slice(-AGENT_HISTORY_LIMIT)) {
    if (row.role === "user") {
      messages.push({ role: "user", content: row.content });
    } else if (row.role === "assistant") {
      messages.push({ role: "assistant", content: row.content });
    } else if (
      row.tool_call_id &&
      row.tool_name &&
      row.tool_arguments &&
      row.tool_state !== "pending"
    ) {
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: row.tool_call_id,
            type: "function",
            function: { name: row.tool_name, arguments: row.tool_arguments },
          },
        ],
      });
      messages.push({
        role: "tool",
        tool_call_id: row.tool_call_id,
        content: row.content,
      });
    }
  }
  return messages;
}

/**
 * Writes this turn has already applied. The budget counts these.
 *
 * A turn is what the user last said and everything the agent did after it,
 * which is the same unit the transcript draws. Counting the whole space would
 * spend the budget once and then ask for ever.
 */
const writesThisTurn = (rows: readonly AgentMessage[]): number => {
  let count = 0;
  for (let at = rows.length - 1; at >= 0; at -= 1) {
    const row = rows[at];
    if (row.role === "user") break;
    if (
      row.role === "tool" &&
      row.tool_state === "applied" &&
      row.tool_name &&
      isAgentWriteTool(row.tool_name)
    ) {
      count += 1;
    }
  }
  return count;
};

const textOf = (content: unknown): string =>
  (Array.isArray(content) ? content : [])
    .filter(
      (part): part is { type: "text"; text: string } =>
        !!part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "text",
    )
    .map((part) => part.text)
    .join("");

/**
 * The tools of one open space, ready for the loop to run.
 *
 * A read runs here and answers the model at once. A write only reaches this
 * point when the permission gate let it through, which happens on the first
 * turn of a new space and nowhere else.
 */
function agentTools(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  userId: string,
  now: () => number,
): AgentTool[] {
  return AGENT_TOOL_DEFINITIONS.map((definition) => {
    const name = definition.function.name;
    return {
      name,
      label: name,
      description: definition.function.description,
      parameters: definition.function.parameters as unknown as TSchema,
      executionMode: "sequential",
      // A model given a schema with no properties can answer `[]` where it
      // means `{}`. Apple Intelligence does. Neither is worth a failed turn.
      prepareArguments: (args: unknown) =>
        args && typeof args === "object" && !Array.isArray(args) ? args : {},
      execute: async (toolCallId: string, params: unknown) => {
        const raw = JSON.stringify(params ?? {});
        const text = isAgentWriteTool(name)
          ? await applyAgentWrite(adapter, space, userId, name, raw, toolCallId, {
              now,
            })
          : await executeAgentRead(adapter, space, name, raw);
        return { content: [{ type: "text" as const, text }] };
      },
    } as AgentTool;
  });
}

/**
 * One turn of the space agent.
 *
 * The loop belongs to the client; the transcript belongs to September. An
 * `Agent` is built from the stored rows, run once, and thrown away. Three
 * hooks join the two: one writes every message that lands, one decides
 * whether a tool may run, and one ends the turn when a change is waiting.
 */
async function runTurn(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  options: AgentRunOptions,
  start: (agent: Agent) => Promise<void>,
  /**
   * Whether this call opens a turn rather than carrying one on.
   *
   * A question the user has just asked has not been stored yet, so the rows
   * still end in the turn before it. Counting those would hand a new question
   * a budget the last turn already spent.
   */
  opening = false,
): Promise<void> {
  const now = options.now ?? defaultNow;
  const id = options.id ?? defaultId;
  let rows = await adapter.listAgentMessages(space.id);
  if (rows.some((row) => row.tool_state === "pending")) return;

  const writer = await adapter.openWriter();
  const identity: ModelIdentity = {
    api: writer.model.api,
    provider: writer.model.provider,
    model: writer.model.id,
  };
  const context = modelContextFrom(providerHistory(rows, options.intro), identity);

  let applied = opening ? 0 : writesThisTurn(rows);
  let partial = "";
  let held = false;
  const blocked = new Set<string>();
  const calls = new Map<string, { name: string; arguments: unknown }>();

  const put = async (row: Omit<AgentMessage, "created_at" | "updated_at">) => {
    const at = nextTranscriptTime(rows, now);
    const stored = await adapter.putAgentMessage({
      ...row,
      created_at: at,
      updated_at: at,
    });
    rows = [...rows, stored];
  };

  // The loop loads with the first turn, not with the app. A user who never
  // opens Agent never downloads it.
  const { Agent } = await import("@earendil-works/pi-agent-core");
  const agent = new Agent({
    initialState: {
      systemPrompt: context.systemPrompt ?? "",
      model: writer.model,
      messages: context.messages as never,
      tools: agentTools(adapter, space, space.user_id, now),
    },
    streamFn: writer.stream,
    toolExecution: "sequential",

    /**
     * The permission gate.
     *
     * A read costs the user nothing, and so does a change the user can see
     * and undo by asking, so both run. Only a delete stops the turn and waits
     * for a press: it is the one act that leaves nothing behind to look at.
     *
     * The budget stops a model that keeps writing. It stops it by asking,
     * which is a brake the user can see and release, rather than by throwing.
     */
    beforeToolCall: async ({ toolCall, args }) => {
      const name = toolCall.name as AgentToolName;
      if (!isAgentToolName(toolCall.name) || !isAgentWriteTool(name)) {
        return undefined;
      }
      const raw = JSON.stringify(args ?? {});
      if (!agentCallNeedsApproval(name, raw) && applied < AGENT_MAX_WRITES) {
        applied += 1;
        return undefined;
      }
      await put({
        id: id(),
        space_id: space.id,
        role: "tool",
        content: agentToolSummary(name, raw),
        tool_call_id: toolCall.id,
        tool_name: name,
        tool_arguments: raw,
        tool_state: "pending",
      });
      blocked.add(toolCall.id);
      held = true;
      return { block: true, reason: "This change is waiting for approval." };
    },

    // A change that is waiting ends the turn. Nothing else bounds it.
    shouldStopAfterTurn: () => held,
  });

  /** Everything the loop settles goes to storage, and nowhere else. */
  agent.subscribe(async (event) => {
    if (event.type === "message_update") {
      const inner = event.assistantMessageEvent;
      if (inner.type === "text_delta" && options.onPartial) {
        partial += inner.delta;
        options.onPartial(partial);
      }
      return;
    }
    if (event.type !== "message_end") return;
    const message = event.message;

    if (message.role === "user") {
      await put({
        id: id(),
        space_id: space.id,
        role: "user",
        content: textOf(message.content) || String(message.content ?? ""),
      });
      return;
    }

    if (message.role === "assistant") {
      partial = "";
      writer.spent?.(message);
      for (const part of message.content) {
        if (part.type === "toolCall") {
          calls.set(part.id, { name: part.name, arguments: part.arguments });
        }
      }
      const said = textOf(message.content).trim();
      if (said) {
        await put({
          id: id(),
          space_id: space.id,
          role: "assistant",
          content: said,
        });
      }
      return;
    }

    if (message.role !== "toolResult") return;
    // A blocked write already has its row, and that row is the one the user
    // acts on. The refusal the loop wrote for the model is not a record.
    if (blocked.has(message.toolCallId)) return;
    if (!isAgentToolName(message.toolName)) return;
    const call = calls.get(message.toolCallId);
    await put({
      id: id(),
      space_id: space.id,
      role: "tool",
      content: textOf(message.content),
      tool_call_id: message.toolCallId,
      tool_name: message.toolName,
      tool_arguments: JSON.stringify(call?.arguments ?? {}),
      tool_state: message.isError ? "failed" : "applied",
    });
  });

  const stop = () => agent.abort();
  options.signal?.addEventListener("abort", stop);
  try {
    await start(agent);
  } finally {
    options.signal?.removeEventListener("abort", stop);
  }

  // The client answers a failure with state, not a throw. September throws,
  // because a screen shows the reason and a caller decides what to do.
  const failure = agent.state.errorMessage;
  if (failure) throw new Error(failure);
}

/** Persist a user request and run until the model answers or proposes a write. */
export async function askSpaceAgent(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  text: string,
  options: AgentRunOptions = {},
): Promise<void> {
  await runTurn(
    adapter,
    space,
    options,
    (agent) => agent.prompt(text.trim()),
    true,
  );
}

/** Continue after automatic reads or a resolved proposal. */
export async function continueSpaceAgent(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  options: AgentRunOptions = {},
): Promise<void> {
  await runTurn(adapter, space, options, (agent) => agent.continue());
}


function nextTranscriptTime(
  rows: readonly AgentMessage[],
  now: () => number,
): number {
  const last = rows[rows.length - 1]?.created_at ?? -1;
  return Math.max(now(), last + 1);
}

async function executeAgentRead(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  name: AgentToolName,
  raw: string,
): Promise<string> {
  const input = parseAgentToolArguments(name, raw) as Record<string, unknown>;
  if (name === "inspect_space") {
    const [current, notes, phrases, messages] = await Promise.all([
      adapter.getSpace(space.id),
      adapter.listNotes(space.id),
      adapter.listPhrases(space.id),
      adapter.listMessages(space.id),
    ]);
    if (!current) throw new Error("This space is gone.");
    return JSON.stringify({
      space: current,
      notes: notes.map((note) => ({
        id: note.id,
        name: note.name,
        characters: note.content.length,
        updated_at: note.updated_at,
      })),
      phrases: phrases.slice(0, 100),
      recent_talk_messages: messages
        .filter((row) => row.type === "user")
        .slice(-20),
    });
  }
  if (name === "read_note") {
    const note = await adapter.getNote(input.note_id as string);
    requireCurrentSpace(note, space.id, "note");
    const offset = input.offset as number;
    const limit = input.limit as number;
    return JSON.stringify({
      id: note.id,
      name: note.name,
      content: note.content.slice(offset, offset + limit),
      offset,
      has_more: offset + limit < note.content.length,
      updated_at: note.updated_at,
    });
  }
  const messages = (await adapter.listMessages(space.id)).filter(
    (row) => row.type === "user",
  );
  const before = input.before_id as string | undefined;
  const end = before
    ? messages.findIndex((row) => row.id === before)
    : messages.length;
  if (before && end < 0) throw new Error("That Talk message is gone.");
  const limit = input.limit as number;
  const slice = messages.slice(Math.max(0, end - limit), end);
  return JSON.stringify({
    messages: slice,
    before_id: slice[0]?.id,
    has_more: end - limit > 0,
  });
}

function requireCurrentSpace<T extends { space_id?: string }>(
  row: T | null | undefined,
  spaceId: string,
  label: string,
): asserts row is T {
  if (!row || row.space_id !== spaceId)
    throw new Error(`That ${label} is not in this space.`);
}

function requireVersion(
  actual: number,
  expected: unknown,
  label: string,
): void {
  if (typeof expected !== "number") {
    throw new Error(`The ${label} changed. Read it again before changing it.`);
  }
  if (actual !== expected)
    throw new Error(`The ${label} changed before approval. Ask again.`);
}

const entityId = (proposalId: string, kind: string) =>
  `agent-${proposalId.slice(0, 220)}-${kind}`;

/** Apply one already-approved proposal to current-space data. */
/**
 * Apply one write to the open space.
 *
 * Two callers reach it: an approval the user pressed, and the first turn of a
 * new space, which applies its own. `seed` names anything the write creates,
 * so applying the same write twice writes the same row rather than two.
 */
export async function applyAgentWrite(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  userId: string,
  name: AgentToolName,
  raw: string,
  seed: string,
  options: Pick<AgentRunOptions, "now"> = {},
): Promise<string> {
  if (!isAgentWriteTool(name)) {
    throw new Error("That tool changes nothing.");
  }
  const now = options.now ?? defaultNow;
  const at = now();
  const input = parseAgentToolArguments(name, raw) as Record<string, unknown>;

  if (name === "configure_space") {
    const current = await adapter.getSpace(space.id);
    if (!current) throw new Error("This space is gone.");
    requireVersion(current.updated_at, input.expected_updated_at, "space");
    if (typeof input.title === "string") {
      const others = (await adapter.listSpaces(userId))
        .filter((row) => row.id !== space.id)
        .map((row) => row.title);
      if (!freeTitle(input.title, others))
        throw new Error("Another space already uses that name.");
    }
    const changed = await adapter.patchSpace({
      id: space.id,
      ...(typeof input.title === "string" ? { title: input.title } : {}),
      ...(typeof input.context === "string" ? { context: input.context } : {}),
      updated_at: at,
    });
    return JSON.stringify({ ok: true, space: changed });
  }

  if (name === "change_note") {
    const operation = input.operation as string;
    if (operation === "create") {
      const made = await adapter.putNote({
        id: entityId(seed, "note"),
        space_id: space.id,
        ...(typeof input.name === "string" ? { name: input.name } : {}),
        content: typeof input.text === "string" ? input.text : "",
        created_at: at,
        updated_at: at,
      });
      return JSON.stringify({ ok: true, note: made });
    }
    const held = await adapter.getNote(input.note_id as string);
    requireCurrentSpace(held, space.id, "note");
    requireVersion(held.updated_at, input.expected_updated_at, "note");
    if (operation === "delete") {
      await adapter.deleteNote(held.id);
      return JSON.stringify({ ok: true, deleted_note_id: held.id });
    }
    const changed = await adapter.putNote({
      ...held,
      ...(operation === "rename" ? { name: input.name as string } : {}),
      ...(operation === "replace" ? { content: input.text as string } : {}),
      ...(operation === "append"
        ? { content: appendToNote(held.content, input.text as string) }
        : {}),
      updated_at: at,
    });
    return JSON.stringify({ ok: true, note: changed });
  }

  if (name === "change_phrase") {
    const operation = input.operation as string;
    const all = await adapter.listPhrases();
    if (operation === "create") {
      const text = input.text as string;
      const made = await adapter.putPhrase({
        id: entityId(seed, "phrase"),
        space_id: space.id,
        text,
        kind: (input.kind as "phrase" | "starter" | undefined) ?? "phrase",
        code: generateCode(text, {
          existingCodes: all.flatMap((row) => (row.code ? [row.code] : [])),
        }),
        pinned: (input.pinned as boolean | undefined) ?? false,
        created_at: at,
        updated_at: at,
      });
      return JSON.stringify({ ok: true, phrase: made });
    }
    const held = all.find((row) => row.id === input.phrase_id);
    requireCurrentSpace(held, space.id, "phrase");
    requireVersion(held.updated_at, input.expected_updated_at, "phrase");
    if (operation === "delete") {
      await adapter.deletePhrase(held.id);
      return JSON.stringify({ ok: true, deleted_phrase_id: held.id });
    }
    const text = operation === "edit" ? (input.text as string) : held.text;
    const changed = await adapter.putPhrase({
      ...held,
      text,
      ...(operation === "pin" ? { pinned: true } : {}),
      ...(operation === "unpin" ? { pinned: false } : {}),
      ...(operation === "edit"
        ? {
            code: generateCode(text, {
              existingCodes: all
                .filter((row) => row.id !== held.id)
                .flatMap((row) => (row.code ? [row.code] : [])),
            }),
          }
        : {}),
      updated_at: at,
    });
    return JSON.stringify({ ok: true, phrase: changed });
  }

  const operation = input.operation as string;
  if (operation === "create") {
    const made = await adapter.putMessage({
      id: entityId(seed, "message"),
      space_id: space.id,
      user_id: userId,
      text: input.text as string,
      type: "user",
      created_at: at,
    });
    return JSON.stringify({ ok: true, talk_message: made, spoken: false });
  }
  const held = await adapter.getMessage(input.message_id as string);
  requireCurrentSpace(held, space.id, "Talk message");
  if (held.type !== "user")
    throw new Error("The agent can change only user-authored Talk messages.");
  if (
    held.text !== input.expected_text ||
    held.created_at !== input.expected_created_at
  ) {
    throw new Error("The Talk message changed before approval. Ask again.");
  }
  if (operation === "delete") {
    await adapter.deleteMessage(held.id);
    await adapter.patchSpace({
      id: space.id,
      reset_phrases_synced_count: true,
      updated_at: at,
    });
    return JSON.stringify({ ok: true, deleted_message_id: held.id });
  }
  const changed = await adapter.putMessage({
    ...held,
    text: input.text as string,
  });
  await adapter.patchSpace({
    id: space.id,
    reset_phrases_synced_count: true,
    updated_at: at,
  });
  return JSON.stringify({ ok: true, talk_message: changed, spoken: false });
}


/** Apply one pending proposal, after checking it belongs to this space. */
export async function executeAgentTool(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  userId: string,
  proposal: AgentMessage,
  options: Pick<AgentRunOptions, "now"> = {},
): Promise<string> {
  if (
    proposal.space_id !== space.id ||
    proposal.role !== "tool" ||
    proposal.tool_state !== "pending" ||
    !proposal.tool_name ||
    !proposal.tool_arguments ||
    !isAgentWriteTool(proposal.tool_name)
  ) {
    throw new Error("That is not a pending change for this space.");
  }
  return applyAgentWrite(
    adapter,
    space,
    userId,
    proposal.tool_name,
    proposal.tool_arguments,
    proposal.id,
    options,
  );
}

/** Resolve a proposal exactly once, then let the model read the result. */
export async function resolveSpaceAgentProposal(
  adapter: AgentRuntimeAdapter,
  space: AgentSpace,
  userId: string,
  proposal: AgentMessage,
  approve: boolean,
  options: AgentRunOptions = {},
): Promise<void> {
  const now = options.now ?? defaultNow;
  if (!approve) {
    await adapter.updateAgentToolState(
      proposal.id,
      "pending",
      "rejected",
      JSON.stringify({ ok: false, rejected: true }),
      now(),
    );
    await continueSpaceAgent(adapter, space, options);
    return;
  }
  try {
    const result = await executeAgentTool(adapter, space, userId, proposal, {
      now,
    });
    await adapter.updateAgentToolState(
      proposal.id,
      "pending",
      "applied",
      result,
      now(),
    );
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : String(reason);
    await adapter.updateAgentToolState(
      proposal.id,
      "pending",
      "failed",
      JSON.stringify({ ok: false, error: message }),
      now(),
    );
  }
  await continueSpaceAgent(adapter, space, options);
}
