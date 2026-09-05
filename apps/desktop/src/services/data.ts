import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

import { currentUserId } from "@/services/os";
import { STARTER_PACK, type SavedPhrase } from "@/rules/phrases";
import type { AgentMessage } from "@september/core/rules/agent";

export type { AgentMessage };

export interface Space {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
  /** How many messages the space held when a model last wrote its phrases. */
  phrases_synced_count?: number;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  space_id?: string;
  user_id: string;
  text: string;
  type: string;
  created_at: number;
}

const messagesKey = (spaceId: string) => ["messages", spaceId];
const phrasesKey = (spaceId?: string) => ["phrases", spaceId ?? "all"];
const agentMessagesKey = (spaceId: string) => ["agent-messages", spaceId];

/**
 * One call to Rust.
 *
 * A Tauri command rejects with a string, not an Error. A screen that reads
 * `error.message` would then show nothing, so every rejection becomes an
 * Error here.
 */
export async function call<T>(command: string, request?: unknown): Promise<T> {
  try {
    return await invoke<T>(command, request === undefined ? undefined : { request });
  } catch (reason) {
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
}

const refresh = (client: QueryClient) => () =>
  client.invalidateQueries({ queryKey: ["spaces"] });

export function useSpaces() {
  return useQuery({
    queryKey: ["spaces"],
    queryFn: () =>
      call<Space[]>("space_list", { user_id: currentUserId() }),
  });
}

export function useCreateSpace() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const at = Date.now();
      const space = await call<Space>("space_put", {
        id: crypto.randomUUID(),
        user_id: currentUserId(),
        title,
        created_at: at,
        updated_at: at,
      });

      // The first space starts with a few phrases, so the stripe above the
      // composer is never empty on the first day.
      const existing = await call<SavedPhrase[]>("phrase_list", { space_id: null });
      if (existing.length === 0) {
        for (const seed of STARTER_PACK) {
          await call<SavedPhrase>("phrase_put", {
            id: crypto.randomUUID(),
            space_id: space.id,
            text: seed.text,
            kind: "phrase",
            code: seed.code,
            pinned: true,
            created_at: at,
            updated_at: at,
          });
        }
      }

      return space;
    },
    onSuccess: () => {
      void refresh(client)();
      void client.invalidateQueries({ queryKey: ["phrases"] });
    },
  });
}

/** `space_put` replaces one complete row, so it takes the whole space. */
/** The fields of a space one writer changes. A field left out keeps its value. */
export interface SpacePatch {
  id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  reset_phrases_synced_count?: boolean;
}

/**
 * Changes some fields of a space.
 *
 * Three writers change a space, and each one knows only its own fields: the
 * user renames it, a model gives it a name and a note, and the phrase sync
 * counts the messages. A whole-row write would put back the fields it read
 * before the others wrote, so only the new fields go over.
 */
export function useUpdateSpace() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (patch: SpacePatch) =>
      call<Space>("space_patch", { ...patch, updated_at: Date.now() }),
    onSuccess: refresh(client),
  });
}

export function useDeleteSpace() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      call<boolean>("space_delete", { id }),
    onSuccess: refresh(client),
  });
}

export function useMessages(spaceId: string) {
  return useQuery({
    queryKey: messagesKey(spaceId),
    queryFn: () =>
      call<Message[]>("message_list", { space_id: spaceId }),
    // The create screen draws the console before a space exists. An empty id
    // holds no messages, and it must not reach SQLite, which rejects an
    // identifier of no bytes.
    enabled: Boolean(spaceId),
  });
}

/**
 * Every message of the user, from every space.
 *
 * The words that the user writes with one person help the words that the user
 * writes with another. `useMessages` gives one space only, so the engine that
 * offers words reads this instead.
 */
export function useAllMessages() {
  return useQuery({
    queryKey: messagesKey("all"),
    queryFn: () => call<Message[]>("message_list", { space_id: null }),
  });
}

export function useSendMessage(spaceId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const message = await call<Message>("message_put", {
        id: crypto.randomUUID(),
        space_id: spaceId,
        user_id: currentUserId(),
        text,
        type: "user",
        created_at: Date.now(),
      });
      return message;
    },
    // The transcript shows the sentence as soon as SQLite accepts it.
    // ponytail: no rollback path — the write is a local file, and a failure
    // keeps the text in the composer.
    onSuccess: (message) =>
      client.setQueryData<Message[]>(messagesKey(spaceId), (rows = []) => [
        ...rows,
        message,
      ]),
  });
}

export function useAgentMessages(spaceId: string) {
  return useQuery({
    queryKey: agentMessagesKey(spaceId),
    queryFn: () => call<AgentMessage[]>("agent_message_list", { space_id: spaceId }),
    enabled: Boolean(spaceId),
  });
}

export function usePutAgentMessage(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (message: AgentMessage) => call<AgentMessage>("agent_message_put", message),
    onSuccess: () => client.invalidateQueries({ queryKey: agentMessagesKey(spaceId) }),
  });
}

export function useResolveAgentTool(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      state,
      content,
    }: {
      id: string;
      state: "applied" | "rejected" | "failed";
      content: string;
    }) => call<AgentMessage>("agent_tool_state", {
      id,
      expected: "pending",
      state,
      content,
      updated_at: Date.now(),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: agentMessagesKey(spaceId) }),
  });
}

// -------------------------------------------------------------------- notes

export interface Note {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
}

const notesKey = (spaceId: string) => ["notes", spaceId];

/** The notes of one space, the one changed last at the front. */
export function useNotes(spaceId: string) {
  return useQuery({
    queryKey: notesKey(spaceId),
    queryFn: () => call<Note[]>("note_list", { space_id: spaceId }),
  });
}

export function useCreateNote(spaceId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () => {
      const at = Date.now();
      return call<Note>("note_put", {
        id: crypto.randomUUID(),
        space_id: spaceId,
        content: "",
        created_at: at,
        updated_at: at,
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: notesKey(spaceId) }),
  });
}

/** The fields of a note that one save writes. */
export interface NotePatch {
  id: string;
  name?: string;
  content?: string;
}

/**
 * Changes the name or the words of a note.
 *
 * `note_put` writes one complete row, and two writers touch a note: the title
 * field and the autosave. The row that Rust holds fills the fields this save
 * does not carry, so one writer never puts back what the other just wrote.
 *
 * ponytail: the read and the write are two calls, not one statement. A note
 * has one screen and one user, so the gap between them cannot hold a second
 * writer. Give notes a `note_patch` command if that stops being true.
 */
export function useUpdateNote(spaceId: string) {
  const client = useQueryClient();

  return useMutation({
    scope: { id: `notes:${spaceId}` },
    mutationFn: async (patch: NotePatch) => {
      const held = await call<Note | null>("note_get", { id: patch.id });
      if (!held) throw new Error("That note is gone.");

      return call<Note>("note_put", {
        ...held,
        ...patch,
        updated_at: Date.now(),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: notesKey(spaceId) }),
  });
}

export function useDeleteNote(spaceId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => call<boolean>("note_delete", { id }),
    onSuccess: () => client.invalidateQueries({ queryKey: notesKey(spaceId) }),
  });
}

// ------------------------------------------------------------ saved phrases

/** The phrases of one space, or every phrase when no space is named. */
/**
 * The saved phrases of one space, or of every space.
 *
 * The three cases stay apart: no argument asks for every phrase, a real id
 * asks for that space, and the empty id asks for none — a space that does not
 * exist yet, whose id SQLite would reject.
 */
export function usePhrases(spaceId?: string) {
  return useQuery({
    queryKey: phrasesKey(spaceId),
    queryFn: () =>
      call<SavedPhrase[]>("phrase_list", { space_id: spaceId ?? null }),
    enabled: spaceId !== "",
  });
}

export function usePutPhrase() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (phrase: SavedPhrase) =>
      call<SavedPhrase>("phrase_put", { ...phrase, updated_at: Date.now() }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["phrases"] }),
  });
}

export function useDeletePhrase() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => call<boolean>("phrase_delete", { id }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["phrases"] }),
  });
}

/**
 * Puts the rows of a model in place of the rows before them.
 *
 * Rust erases only the rows that are not pinned, in one transaction, so a
 * phrase that the user keeps cannot be lost here.
 */
export function useReplaceAiPhrases() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ spaceId, phrases }: { spaceId: string; phrases: SavedPhrase[] }) =>
      call<SavedPhrase[]>("phrase_replace_ai", { space_id: spaceId, phrases }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["phrases"] }),
  });
}
