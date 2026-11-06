import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { platform } from "@platform/adapter";
import { STARTER_PACK } from "@september/core/rules/phrases/starter-pack";
import type { Message, SavedPhrase, Space, SpacePatch } from "@september/core/rules/records";

import { currentUserId } from "./settings";

const store = platform.store;

const spacesKey = ["spaces"];
const messagesKey = (spaceId: string) => ["messages", spaceId];
const phrasesKey = (spaceId?: string) => ["phrases", spaceId ?? "all"];
const notesKey = (spaceId: string) => ["notes", spaceId];
const agentMessagesKey = (spaceId: string) => ["agent-messages", spaceId];

/** Reads the keys again after a write. */
function useRefresh(...keys: unknown[][]) {
  const client = useQueryClient();
  return () =>
    Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

/** The spaces of the user, for `useQuery` or a `fetchQuery` before the first screen. */
export const spacesQuery = () => ({
  queryKey: spacesKey,
  queryFn: () => store.listSpaces(currentUserId()),
});

export function useSpaces() {
  return useQuery(spacesQuery());
}

/**
 * Makes a space. The first space starts with the starter phrases.
 *
 * The new space goes into the held list at once, so a screen that opens it
 * by slug finds it before the list is read again.
 */
export function useCreateSpace() {
  const client = useQueryClient();
  const refresh = useRefresh(spacesKey, ["phrases"]);
  return useMutation({
    mutationFn: async (title: string) => {
      const at = Date.now();
      const created = await store.putSpace({
        id: crypto.randomUUID(),
        user_id: currentUserId(),
        title,
        created_at: at,
        updated_at: at,
      });
      if ((await store.listPhrases()).length === 0) {
        for (const seed of STARTER_PACK) {
          await store.putPhrase({
            id: crypto.randomUUID(),
            space_id: created.id,
            text: seed.text,
            kind: "phrase",
            code: seed.code,
            pinned: true,
            created_at: at,
            updated_at: at,
          });
        }
      }
      return created;
    },
    onSuccess: (created) => {
      client.setQueryData<Space[]>(spacesKey, (held) =>
        held?.some((one) => one.id === created.id) ? held : [created, ...(held ?? [])],
      );
      void refresh();
    },
  });
}

/**
 * Changes some fields of a space. Three writers change a space, and each one
 * sends only its own fields, so no writer puts back what another just wrote.
 */
export function useUpdateSpace() {
  const refresh = useRefresh(spacesKey);
  return useMutation({
    mutationFn: (patch: Omit<SpacePatch, "updated_at">) =>
      store.patchSpace({ ...patch, updated_at: Date.now() }),
    onSuccess: refresh,
  });
}

export function useDeleteSpace() {
  const refresh = useRefresh(spacesKey, ["messages"]);
  return useMutation({
    mutationFn: (id: string) => store.deleteSpace(id),
    onSuccess: refresh,
  });
}

/** The messages of one space. An empty id is a space that does not exist yet. */
export function useMessages(spaceId: string) {
  return useQuery({
    queryKey: messagesKey(spaceId),
    queryFn: () => store.listMessages(spaceId),
    enabled: Boolean(spaceId),
  });
}

/**
 * Every message of the user, for the engine that offers words. A screen that
 * wants it only sometimes says so.
 */
export function useAllMessages(enabled = true) {
  return useQuery({
    queryKey: messagesKey("all"),
    queryFn: () => store.listMessages(),
    enabled,
  });
}

/** Sends a message. The transcript shows it as soon as the store keeps it. */
export function useSendMessage(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      store.putMessage({
        id: crypto.randomUUID(),
        space_id: spaceId,
        user_id: currentUserId(),
        text,
        type: "user",
        created_at: Date.now(),
      }),
    onSuccess: (message) =>
      client.setQueryData<Message[]>(messagesKey(spaceId), (rows = []) => [...rows, message]),
  });
}

/** Reads again everything the agent of a space can change. */
export function useRefreshAgentSpace(spaceId: string) {
  return useRefresh(
    agentMessagesKey(spaceId),
    spacesKey,
    ["messages"],
    notesKey(spaceId),
    ["phrases"],
  );
}

export function useAgentMessages(spaceId: string) {
  return useQuery({
    queryKey: agentMessagesKey(spaceId),
    queryFn: () => store.listAgentMessages(spaceId),
    enabled: Boolean(spaceId),
  });
}

/** The notes of one space, the one changed last at the front. */
export function useNotes(spaceId: string) {
  return useQuery({
    queryKey: notesKey(spaceId),
    queryFn: () => store.listNotes(spaceId),
  });
}

export function useCreateNote(spaceId: string) {
  const refresh = useRefresh(notesKey(spaceId));
  return useMutation({
    mutationFn: () => {
      const at = Date.now();
      return store.putNote({
        id: crypto.randomUUID(),
        space_id: spaceId,
        content: "",
        created_at: at,
        updated_at: at,
      });
    },
    onSuccess: refresh,
  });
}

/** The fields of a note that one save writes. */
export interface NotePatch {
  id: string;
  name?: string;
  content?: string;
}

/**
 * Changes the name or the words of a note. The title field and the autosave
 * both write a note, so the save fills the fields it does not carry from the
 * stored row. One scope runs the saves of a space one after the other.
 */
export function useUpdateNote(spaceId: string) {
  const refresh = useRefresh(notesKey(spaceId));
  return useMutation({
    scope: { id: `notes:${spaceId}` },
    mutationFn: async (patch: NotePatch) => {
      const held = await store.getNote(patch.id);
      if (!held) throw new Error("That note is gone.");
      return store.putNote({ ...held, ...patch, updated_at: Date.now() });
    },
    onSuccess: refresh,
  });
}

export function useDeleteNote(spaceId: string) {
  const refresh = useRefresh(notesKey(spaceId));
  return useMutation({
    mutationFn: (id: string) => store.deleteNote(id),
    onSuccess: refresh,
  });
}

/**
 * The saved phrases of one space, or of every space when no id is given. The
 * empty id is a space that does not exist yet, which holds none.
 */
export function usePhrases(spaceId?: string) {
  return useQuery({
    queryKey: phrasesKey(spaceId),
    queryFn: () => store.listPhrases(spaceId),
    enabled: spaceId !== "",
  });
}

/** Keeps a saved phrase of the stripe, so a regeneration cannot take it away. */
export function usePinPhrase(spaceId: string) {
  const { data: phrases } = usePhrases(spaceId);
  const put = usePutPhrase();
  return (text: string) => {
    const key = text.trim().toLowerCase();
    const row = phrases?.find((one) => one.text.trim().toLowerCase() === key);
    if (row && !row.pinned) put.mutate({ ...row, pinned: true });
  };
}

export function usePutPhrase() {
  const refresh = useRefresh(["phrases"]);
  return useMutation({
    mutationFn: (phrase: SavedPhrase) => store.putPhrase({ ...phrase, updated_at: Date.now() }),
    onSuccess: refresh,
  });
}

export function useDeletePhrase() {
  const refresh = useRefresh(["phrases"]);
  return useMutation({
    mutationFn: (id: string) => store.deletePhrase(id),
    onSuccess: refresh,
  });
}

/** Puts the rows of a model in place of the unpinned rows of one space. */
export function useReplaceAiPhrases() {
  const refresh = useRefresh(["phrases"]);
  return useMutation({
    mutationFn: ({ spaceId, phrases }: { spaceId: string; phrases: SavedPhrase[] }) =>
      store.replaceAiPhrases(spaceId, phrases),
    onSuccess: refresh,
  });
}
