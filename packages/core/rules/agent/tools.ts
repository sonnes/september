/** The tools the Agent of a space can call, and the arguments each one accepts. */

import type { Message, PhraseKind, SavedPhrase, Space } from "../records.ts";

export const AGENT_NOTE_CHUNK_LIMIT = 8_000;
export const AGENT_TALK_PAGE_LIMIT = 100;
const AGENT_TALK_PAGE_DEFAULT = 20;
const AGENT_TEXT_LIMIT = 10_000;
/** How many phrases and recent Talk messages `inspect_space` returns. */
export const INSPECT_PHRASE_LIMIT = 100;
export const INSPECT_TALK_LIMIT = 20;

export type AgentToolName =
  | "inspect_space"
  | "read_note"
  | "read_talk_messages"
  | "configure_space"
  | "change_note"
  | "change_phrase"
  | "change_talk_message";

interface AgentToolDefinition {
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
export const AGENT_TOOLS: readonly AgentToolDefinition[] = [
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

/** One validated call, with the tool it calls. */
export type AgentCall =
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
      kind?: PhraseKind;
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
  AGENT_TOOLS.some((tool) => tool.function.name === value);

/** Whether a tool changes the space rather than only reading it. */
export const isAgentWriteTool = (name: AgentToolName): boolean =>
  !READ_TOOLS.has(name);

/** The JSON object in a text, or an error that says why there is none. */
export function jsonObject(raw: string, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
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

function optionalChoice<T>(
  row: Record<string, unknown>,
  key: string,
  choices: readonly T[],
  problem: string,
): T | undefined {
  const value = row[key];
  if (value === undefined || value === null) return undefined;
  if (!choices.includes(value as T)) throw new Error(problem);
  return value as T;
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

function optional<K extends string, T>(
  key: K,
  value: T | undefined,
): { [P in K]?: T } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]: T });
}

/** Validates untrusted model arguments. Throws a reason the model can act on. */
export function parseAgentCall(name: AgentToolName, raw: string): AgentCall {
  const row = jsonObject(raw, "Tool arguments");

  if (name === "inspect_space") {
    allowed(row, []);
    return { tool: name };
  }
  if (name === "read_note") {
    allowed(row, ["note_id", "offset", "limit"]);
    const offset = optionalInteger(row, "offset") ?? 0;
    const limit = optionalInteger(row, "limit") ?? AGENT_NOTE_CHUNK_LIMIT;
    if (limit < 1 || limit > AGENT_NOTE_CHUNK_LIMIT)
      throw new Error("limit is out of range.");
    return { tool: name, note_id: requiredText(row, "note_id"), offset, limit };
  }
  if (name === "read_talk_messages") {
    allowed(row, ["before_id", "limit"]);
    const limit = optionalInteger(row, "limit") ?? AGENT_TALK_PAGE_DEFAULT;
    if (limit < 1 || limit > AGENT_TALK_PAGE_LIMIT)
      throw new Error("limit is out of range.");
    return {
      tool: name,
      ...optional("before_id", optionalText(row, "before_id")),
      limit,
    };
  }
  if (name === "configure_space") {
    allowed(row, ["title", "context", "expected_updated_at"]);
    const title = optionalText(row, "title");
    const context = optionalText(row, "context");
    if (title === undefined && context === undefined)
      throw new Error("A title or context is required.");
    return {
      tool: name,
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
      tool: name,
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
    return {
      tool: name,
      operation: op,
      ...optional("phrase_id", phrase_id),
      ...optional("text", text),
      ...optional(
        "kind",
        optionalChoice(row, "kind", ["phrase", "starter"] as const, "kind is not supported."),
      ),
      ...optional(
        "pinned",
        optionalChoice(row, "pinned", [true, false], "pinned must be true or false."),
      ),
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
    tool: name,
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

/** A call read for a screen: the call, or the reason it is not valid. Never throws. */
export type AgentCallReading =
  | { ok: true; call: AgentCall }
  | { ok: false; error: string };

export function readAgentCall(name: AgentToolName, raw: string): AgentCallReading {
  try {
    return { ok: true, call: parseAgentCall(name, raw) };
  } catch (reason) {
    return {
      ok: false,
      error: reason instanceof Error ? reason.message : String(reason),
    };
  }
}

/** The operation of a valid call, if its tool has one. */
export const callOperation = (call: AgentCall): string | undefined =>
  "operation" in call ? call.operation : undefined;

/**
 * Whether a call must wait for a press before it runs.
 *
 * A delete waits, because it leaves nothing to look at afterwards. A call
 * whose arguments are not valid also waits, so the user sees it and its
 * reason. Every other write is visible in the space the moment it lands.
 */
export function agentCallNeedsApproval(name: AgentToolName, raw: string): boolean {
  if (!isAgentWriteTool(name)) return false;
  const read = readAgentCall(name, raw);
  return !read.ok || callOperation(read.call) === "delete";
}

/** What `inspect_space` returns to the model. */
export interface InspectSpaceResult {
  space: Space;
  notes: { id: string; name?: string; characters: number; updated_at: number }[];
  phrases: SavedPhrase[];
  recent_talk_messages: Message[];
}

/** What `read_note` returns to the model. */
export interface ReadNoteResult {
  id: string;
  name?: string;
  content: string;
  offset: number;
  has_more: boolean;
  updated_at: number;
}

/** What `read_talk_messages` returns to the model. */
export interface ReadTalkResult {
  messages: Message[];
  before_id?: string;
  has_more: boolean;
}

/** The part of a write result that a screen reads. A write adds the rows it changed. */
export interface WriteResult {
  ok: boolean;
  error?: string;
}
