'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useOptimisticRecordMutation } from '@/packages/shared/lib/data';

import {
  createDefaultSpace,
  createMessage,
  createSpace,
  deleteSpace,
  updateSpace,
} from '../mutations';
import type { CreateMessageData, Message, Space } from '../types';

export function useCreateSpaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, title }: { userId: string; title?: string }) =>
      createSpace(userId, title),
    networkMode: 'always',
    onSuccess: space => {
      queryClient.setQueryData<Space[]>(['spaces'], current => [...(current ?? []), space]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['spaces'] }),
  });
}

export function useCreateDefaultSpaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => createDefaultSpace(userId),
    networkMode: 'always',
    onSuccess: space => {
      queryClient.setQueryData<Space[]>(['spaces'], current => [...(current ?? []), space]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['spaces'] }),
  });
}

export interface UpdateSpaceVariables {
  id: string;
  updates: Partial<Space>;
}

export function optimisticUpdateSpace(
  current: Space[] | undefined,
  { id, updates }: UpdateSpaceVariables
): Space[] {
  return (current ?? []).map(space =>
    space.id === id ? { ...space, ...updates, updated_at: new Date() } : space
  );
}

export function optimisticDeleteSpace(current: Space[] | undefined, id: string): Space[] {
  return (current ?? []).filter(space => space.id !== id);
}

export function optimisticInsertMessage(
  current: Message[] | undefined,
  message: CreateMessageData
): Message[] {
  if (!message.id) return current ?? [];
  const { editorStats: _, ...stored } = message;
  return [
    ...(current ?? []),
    { ...stored, id: message.id, created_at: message.created_at ?? new Date() },
  ];
}

export function useUpdateSpaceMutation() {
  return useOptimisticRecordMutation<void, UpdateSpaceVariables, Space[]>({
    queryKey: ['spaces'],
    mutationFn: ({ id, updates }) => updateSpace(id, updates),
    update: optimisticUpdateSpace,
  });
}

export function useDeleteSpaceMutation() {
  return useOptimisticRecordMutation<void, string, Space[]>({
    queryKey: ['spaces'],
    mutationFn: deleteSpace,
    update: optimisticDeleteSpace,
  });
}

export function useCreateMessageMutation() {
  return useOptimisticRecordMutation<Message, CreateMessageData, Message[]>({
    queryKey: ['messages'],
    mutationFn: createMessage,
    update: optimisticInsertMessage,
  });
}
