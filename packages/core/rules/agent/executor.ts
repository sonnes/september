/** Runs one tool call against the data of the open space. */

import { appendToNote } from "../notes.ts";
import { generateCode } from "../phrases/codes.ts";
import type {
  Message,
  Note,
  SavedPhrase,
  Space,
  SpacePatch,
} from "../records.ts";
import { freeTitle } from "../spaces.ts";
import {
  INSPECT_PHRASE_LIMIT,
  INSPECT_TALK_LIMIT,
  isAgentWriteTool,
  parseAgentCall,
  type AgentCall,
  type AgentToolName,
  type InspectSpaceResult,
  type ReadNoteResult,
  type ReadTalkResult,
} from "./tools.ts";

/** The data operations of one platform that the tools use. */
export interface AgentSpaceData {
  listSpaces(userId: string): Promise<Space[]>;
  getSpace(id: string): Promise<Space | null>;
  patchSpace(patch: SpacePatch): Promise<Space>;
  listNotes(spaceId: string): Promise<Note[]>;
  getNote(id: string): Promise<Note | null>;
  putNote(note: Note): Promise<Note>;
  deleteNote(id: string): Promise<boolean>;
  listPhrases(spaceId?: string): Promise<SavedPhrase[]>;
  putPhrase(phrase: SavedPhrase): Promise<SavedPhrase>;
  deletePhrase(id: string): Promise<boolean>;
  listMessages(spaceId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | null>;
  putMessage(message: Message): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;
}

/** Runs a read tool and returns its result as JSON for the model. */
export async function executeAgentRead(
  data: AgentSpaceData,
  space: Space,
  name: AgentToolName,
  raw: string,
): Promise<string> {
  const call = parseAgentCall(name, raw);
  if (call.tool === "inspect_space") {
    const [current, notes, phrases, messages] = await Promise.all([
      data.getSpace(space.id),
      data.listNotes(space.id),
      data.listPhrases(space.id),
      data.listMessages(space.id),
    ]);
    if (!current) throw new Error("This space is gone.");
    const result: InspectSpaceResult = {
      space: current,
      notes: notes.map((note) => ({
        id: note.id,
        name: note.name,
        characters: note.content.length,
        updated_at: note.updated_at,
      })),
      phrases: phrases.slice(0, INSPECT_PHRASE_LIMIT),
      recent_talk_messages: messages
        .filter((row) => row.type === "user")
        .slice(-INSPECT_TALK_LIMIT),
    };
    return JSON.stringify(result);
  }
  if (call.tool === "read_note") {
    const note = await data.getNote(call.note_id);
    requireCurrentSpace(note, space.id, "note");
    const { offset, limit } = call;
    const result: ReadNoteResult = {
      id: note.id,
      name: note.name,
      content: note.content.slice(offset, offset + limit),
      offset,
      has_more: offset + limit < note.content.length,
      updated_at: note.updated_at,
    };
    return JSON.stringify(result);
  }
  if (call.tool === "read_talk_messages") {
    const messages = (await data.listMessages(space.id)).filter(
      (row) => row.type === "user",
    );
    const before = call.before_id;
    const end = before
      ? messages.findIndex((row) => row.id === before)
      : messages.length;
    if (before && end < 0) throw new Error("That Talk message is gone.");
    const slice = messages.slice(Math.max(0, end - call.limit), end);
    const result: ReadTalkResult = {
      messages: slice,
      before_id: slice[0]?.id,
      has_more: end - call.limit > 0,
    };
    return JSON.stringify(result);
  }
  throw new Error("That tool changes the space.");
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
  expected: number | undefined,
  label: string,
): void {
  if (expected === undefined) {
    throw new Error(`The ${label} changed. Read it again before changing it.`);
  }
  if (actual !== expected)
    throw new Error(`The ${label} changed before approval. Ask again.`);
}

const entityId = (seed: string, kind: string) =>
  `agent-${seed.slice(0, 220)}-${kind}`;

const written = (fields: Record<string, unknown>): string =>
  JSON.stringify({ ok: true, ...fields });

const codesOf = (rows: readonly SavedPhrase[]): string[] =>
  rows.flatMap((row) => (row.code ? [row.code] : []));

/**
 * Applies one write to the open space and returns its result as JSON.
 *
 * `seed` names anything the write creates, so the same write applied twice
 * writes the same row.
 */
export async function applyAgentWrite(
  data: AgentSpaceData,
  space: Space,
  userId: string,
  name: AgentToolName,
  raw: string,
  seed: string,
  now: () => number,
): Promise<string> {
  if (!isAgentWriteTool(name)) throw new Error("That tool changes nothing.");
  const call = parseAgentCall(name, raw);
  const at = now();

  switch (call.tool) {
    case "configure_space":
      return configureSpace(data, space, userId, call, at);
    case "change_note":
      return changeNote(data, space, call, seed, at);
    case "change_phrase":
      return changePhrase(data, space, call, seed, at);
    case "change_talk_message":
      return changeTalkMessage(data, space, userId, call, seed, at);
    default:
      throw new Error("That tool changes nothing.");
  }
}

async function configureSpace(
  data: AgentSpaceData,
  space: Space,
  userId: string,
  call: Extract<AgentCall, { tool: "configure_space" }>,
  at: number,
): Promise<string> {
  const current = await data.getSpace(space.id);
  if (!current) throw new Error("This space is gone.");
  requireVersion(current.updated_at, call.expected_updated_at, "space");
  if (call.title !== undefined) {
    const others = (await data.listSpaces(userId))
      .filter((row) => row.id !== space.id)
      .map((row) => row.title);
    if (!freeTitle(call.title, others))
      throw new Error("Another space already uses that name.");
  }
  const changed = await data.patchSpace({
    id: space.id,
    ...(call.title === undefined ? {} : { title: call.title }),
    ...(call.context === undefined ? {} : { context: call.context }),
    updated_at: at,
  });
  return written({ space: changed });
}

async function changeNote(
  data: AgentSpaceData,
  space: Space,
  call: Extract<AgentCall, { tool: "change_note" }>,
  seed: string,
  at: number,
): Promise<string> {
  if (call.operation === "create") {
    const made = await data.putNote({
      id: entityId(seed, "note"),
      space_id: space.id,
      ...(call.name === undefined ? {} : { name: call.name }),
      content: call.text ?? "",
      created_at: at,
      updated_at: at,
    });
    return written({ note: made });
  }
  const held = await data.getNote(call.note_id ?? "");
  requireCurrentSpace(held, space.id, "note");
  requireVersion(held.updated_at, call.expected_updated_at, "note");
  if (call.operation === "delete") {
    await data.deleteNote(held.id);
    return written({ deleted_note_id: held.id });
  }
  const text = call.text ?? "";
  const changed = await data.putNote({
    ...held,
    ...(call.operation === "rename" ? { name: call.name } : {}),
    ...(call.operation === "replace" ? { content: text } : {}),
    ...(call.operation === "append"
      ? { content: appendToNote(held.content, text) }
      : {}),
    updated_at: at,
  });
  return written({ note: changed });
}

async function changePhrase(
  data: AgentSpaceData,
  space: Space,
  call: Extract<AgentCall, { tool: "change_phrase" }>,
  seed: string,
  at: number,
): Promise<string> {
  const all = await data.listPhrases();
  if (call.operation === "create") {
    const text = call.text ?? "";
    const made = await data.putPhrase({
      id: entityId(seed, "phrase"),
      space_id: space.id,
      text,
      kind: call.kind ?? "phrase",
      code: generateCode(text, { existingCodes: codesOf(all) }),
      pinned: call.pinned ?? false,
      created_at: at,
      updated_at: at,
    });
    return written({ phrase: made });
  }
  const held = all.find((row) => row.id === call.phrase_id);
  requireCurrentSpace(held, space.id, "phrase");
  requireVersion(held.updated_at, call.expected_updated_at, "phrase");
  if (call.operation === "delete") {
    await data.deletePhrase(held.id);
    return written({ deleted_phrase_id: held.id });
  }
  const text = call.operation === "edit" ? (call.text ?? held.text) : held.text;
  const changed = await data.putPhrase({
    ...held,
    text,
    ...(call.operation === "pin" ? { pinned: true } : {}),
    ...(call.operation === "unpin" ? { pinned: false } : {}),
    ...(call.operation === "edit"
      ? {
          code: generateCode(text, {
            existingCodes: codesOf(all.filter((row) => row.id !== held.id)),
          }),
        }
      : {}),
    updated_at: at,
  });
  return written({ phrase: changed });
}

async function changeTalkMessage(
  data: AgentSpaceData,
  space: Space,
  userId: string,
  call: Extract<AgentCall, { tool: "change_talk_message" }>,
  seed: string,
  at: number,
): Promise<string> {
  if (call.operation === "create") {
    const made = await data.putMessage({
      id: entityId(seed, "message"),
      space_id: space.id,
      user_id: userId,
      text: call.text ?? "",
      type: "user",
      created_at: at,
    });
    return written({ talk_message: made, spoken: false });
  }
  const held = await data.getMessage(call.message_id ?? "");
  requireCurrentSpace(held, space.id, "Talk message");
  if (held.type !== "user")
    throw new Error("The agent can change only user-authored Talk messages.");
  if (
    held.text !== call.expected_text ||
    held.created_at !== call.expected_created_at
  ) {
    throw new Error("The Talk message changed before approval. Ask again.");
  }
  const reset = () =>
    data.patchSpace({
      id: space.id,
      reset_phrases_synced_count: true,
      updated_at: at,
    });
  if (call.operation === "delete") {
    await data.deleteMessage(held.id);
    await reset();
    return written({ deleted_message_id: held.id });
  }
  const changed = await data.putMessage({ ...held, text: call.text ?? held.text });
  await reset();
  return written({ talk_message: changed, spoken: false });
}
