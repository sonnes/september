import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import supabase from './client';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeConfig {
  table: string;
  schema?: string;
  filter?: string;
  events?: RealtimeEventType[];
}

export interface RealtimeCallbacks<T = any> {
  onInsert?: (newRecord: T) => void;
  onUpdate?: (newRecord: T, oldRecord?: T) => void;
  onDelete?: (oldRecord: T) => void;
  onError?: (error: Error) => void;
  onSubscribe?: (status: string) => void;
}

export function createRealtimeSubscription<T extends Record<string, any> = any>(
  channelName: string,
  config: RealtimeConfig,
  callbacks: RealtimeCallbacks<T>
): RealtimeChannel {
  const { table, schema = 'public', filter, events = ['INSERT', 'UPDATE', 'DELETE'] } = config;
  const { onInsert, onUpdate, onDelete, onError, onSubscribe } = callbacks;

  const channel = supabase.channel(channelName);

  // Add event listeners for each specified event
  events.forEach(event => {
    channel.on(
      'postgres_changes' as any,
      {
        event,
        schema,
        table,
        ...(filter && { filter }),
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        try {
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert) {
                onInsert(payload.new as T);
              }
              break;
            case 'UPDATE':
              if (onUpdate) {
                onUpdate(payload.new as T, payload.old as T);
              }
              break;
            case 'DELETE':
              if (onDelete) {
                onDelete(payload.old as T);
              }
              break;
          }
        } catch (error) {
          console.error(`Error handling ${event} event:`, error);
          if (onError) {
            onError(error as Error);
          }
        }
      }
    );
  });

  // Subscribe to the channel
  channel.subscribe(status => {
    if (onSubscribe) {
      onSubscribe(status);
    }
  });

  return channel;
}

export function removeRealtimeSubscription(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// Convenience function for common table subscriptions
export function subscribeToTable<T extends Record<string, any> = any>(
  tableName: string,
  filter: string,
  callbacks: RealtimeCallbacks<T>
): RealtimeChannel {
  return createRealtimeSubscription<T>(
    `${tableName}_changes`,
    {
      table: tableName,
      filter,
    },
    callbacks
  );
}

// Specific subscription helpers
export function subscribeToUserMessages<T extends Record<string, any> = any>(
  userId: string,
  callbacks: RealtimeCallbacks<T>
): RealtimeChannel {
  return subscribeToTable<T>('messages', `user_id=eq.${userId}`, callbacks);
}

export function subscribeToUserAccount<T extends Record<string, any> = any>(
  userId: string,
  callbacks: RealtimeCallbacks<T>
): RealtimeChannel {
  return subscribeToTable<T>('accounts', `id=eq.${userId}`, callbacks);
}
