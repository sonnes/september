import { invoke } from '@tauri-apps/api/core';

import type { Mutation } from '../types';

export interface DesktopOutboxMutation extends Mutation {
  outboxId: number;
}

export interface DesktopRemoteResult {
  applied: number;
  collections: string[];
}

export interface DesktopSyncStorage {
  listOutbox: (limit?: number) => Promise<DesktopOutboxMutation[]>;
  ackOutbox: (outboxIds: number[]) => Promise<number>;
  getCursor: () => Promise<number>;
  applyRemote: (mutations: Mutation[], cursor: number) => Promise<DesktopRemoteResult>;
}

export function createDesktopSyncStorage(): DesktopSyncStorage {
  return {
    listOutbox: (limit = 100) => invoke('sync_outbox_list', { request: { limit } }),
    ackOutbox: outboxIds => invoke('sync_outbox_ack', { request: { outboxIds } }),
    getCursor: async () => {
      const value = await invoke<unknown>('sync_metadata_get', {
        request: { key: 'cloud_cursor' },
      });
      const cursor = Number(value ?? 0);
      return Number.isFinite(cursor) ? cursor : 0;
    },
    applyRemote: (mutations, cursor) =>
      invoke('sync_apply_remote', { request: { mutations, cursor } }),
  };
}
