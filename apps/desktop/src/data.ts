import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

import { currentUserId } from "./os";

export interface Space {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
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

/**
 * One call to Rust.
 *
 * A Tauri command rejects with a string, not an Error. A screen that reads
 * `error.message` would then show nothing, so every rejection becomes an
 * Error here.
 */
async function call<T>(command: string, request?: unknown): Promise<T> {
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
    mutationFn: (title: string) => {
      const at = Date.now();
      return call<Space>("space_put", {
        id: crypto.randomUUID(),
        user_id: currentUserId(),
        title,
        created_at: at,
        updated_at: at,
      });
    },
    onSuccess: refresh(client),
  });
}

/** `space_put` replaces one complete row, so it takes the whole space. */
export function useUpdateSpace() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (space: Space) =>
      call<Space>("space_put", { ...space, updated_at: Date.now() }),
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
  });
}

export function useSendMessage(spaceId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (text: string) =>
      call<Message>("message_put", {
        id: crypto.randomUUID(),
        space_id: spaceId,
        user_id: currentUserId(),
        text,
        type: "user",
        created_at: Date.now(),
      }),
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
