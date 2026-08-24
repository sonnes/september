import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { STARTER_PACK, type SavedPhrase } from '@/rules/phrases';
import { currentUserId } from '@/services/os';
import {
  getRepository,
  type Message,
  type SpacePatch,
} from '@/services/repository';

export type { AnalyticsEvent, Message, Note, SavedPhrase, Space, SpacePatch } from './repository';

const messagesKey = (spaceId: string) => ['messages', spaceId];
const phrasesKey = (spaceId?: string) => ['phrases', spaceId ?? 'all'];
const notesKey = (spaceId: string) => ['notes', spaceId];

const refreshSpaces = (client: QueryClient) => () =>
  client.invalidateQueries({ queryKey: ['spaces'] });

export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: async () => (await getRepository()).listSpaces(currentUserId()),
  });
}

export function useCreateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const repository = await getRepository();
      const at = Date.now();
      const created = await repository.putSpace({
        id: crypto.randomUUID(),
        user_id: currentUserId(),
        title,
        created_at: at,
        updated_at: at,
      });

      if ((await repository.listPhrases()).length === 0) {
        for (const seed of STARTER_PACK) {
          await repository.putPhrase({
            id: crypto.randomUUID(),
            space_id: created.id,
            text: seed.text,
            kind: 'phrase',
            code: seed.code,
            pinned: true,
            created_at: at,
            updated_at: at,
          });
        }
      }
      return created;
    },
    onSuccess: () => {
      void refreshSpaces(client)();
      void client.invalidateQueries({ queryKey: ['phrases'] });
    },
  });
}

export function useUpdateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Omit<SpacePatch, 'updated_at'>) =>
      (await getRepository()).patchSpace({ ...patch, updated_at: Date.now() }),
    onSuccess: refreshSpaces(client),
  });
}

export function useDeleteSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await getRepository()).deleteSpace(id),
    onSuccess: refreshSpaces(client),
  });
}

export function useMessages(spaceId: string) {
  return useQuery({
    queryKey: messagesKey(spaceId),
    queryFn: async () => (await getRepository()).listMessages(spaceId),
    enabled: Boolean(spaceId),
  });
}

export function useAllMessages() {
  return useQuery({
    queryKey: messagesKey('all'),
    queryFn: async () => (await getRepository()).listMessages(),
  });
}

export function useSendMessage(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) =>
      (await getRepository()).putMessage({
        id: crypto.randomUUID(),
        space_id: spaceId,
        user_id: currentUserId(),
        text,
        type: 'user',
        created_at: Date.now(),
      }),
    onSuccess: message =>
      client.setQueryData<Message[]>(messagesKey(spaceId), (rows = []) => [...rows, message]),
  });
}

export function useNotes(spaceId: string) {
  return useQuery({
    queryKey: notesKey(spaceId),
    queryFn: async () => (await getRepository()).listNotes(spaceId),
  });
}

export function useCreateNote(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const at = Date.now();
      return (await getRepository()).putNote({
        id: crypto.randomUUID(),
        space_id: spaceId,
        content: '',
        created_at: at,
        updated_at: at,
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: notesKey(spaceId) }),
  });
}

export interface NotePatch {
  id: string;
  name?: string;
  content?: string;
}

export function useUpdateNote(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: NotePatch) => {
      const repository = await getRepository();
      const held = await repository.getNote(patch.id);
      if (!held) throw new Error('that note is gone');
      return repository.putNote({ ...held, ...patch, updated_at: Date.now() });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: notesKey(spaceId) }),
  });
}

export function useDeleteNote(spaceId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await getRepository()).deleteNote(id),
    onSuccess: () => client.invalidateQueries({ queryKey: notesKey(spaceId) }),
  });
}

export function usePhrases(spaceId?: string) {
  return useQuery({
    queryKey: phrasesKey(spaceId),
    queryFn: async () => (await getRepository()).listPhrases(spaceId),
    enabled: spaceId !== '',
  });
}

export function usePutPhrase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (phrase: SavedPhrase) =>
      (await getRepository()).putPhrase({ ...phrase, updated_at: Date.now() }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['phrases'] }),
  });
}

export function useDeletePhrase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await getRepository()).deletePhrase(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['phrases'] }),
  });
}

export function useReplaceAiPhrases() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, phrases }: { spaceId: string; phrases: SavedPhrase[] }) =>
      (await getRepository()).replaceAiPhrases(spaceId, phrases),
    onSuccess: () => client.invalidateQueries({ queryKey: ['phrases'] }),
  });
}

export async function putUsageEvent(event: Parameters<Awaited<ReturnType<typeof getRepository>>['putAnalyticsEvent']>[0]) {
  return (await getRepository()).putAnalyticsEvent(event);
}

export async function listUsageEvents(userId: string, startAt: number, endAt: number) {
  return (await getRepository()).listAnalyticsEvents(userId, startAt, endAt);
}
