import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/lib/indexeddb/collection-v2';
import { AnalyticsEvent, AnalyticsEventSchema } from './types/index';

/**
 * Analytics collection using TanStack DB with IndexedDB persistence
 * Stores all analytics events for later analysis and reporting
 *
 * Storage structure:
 * - Database: 'analytics'
 * - Store: 'analytics_events'
 * - Key: event id (string UUID)
 *
 * The collection supports:
 * - Full-text search on event data
 * - Filtering by event type, user, and date range
 * - Multi-tab synchronization via BroadcastChannel
 * - Automatic persistence to IndexedDB
 */
export const analyticsCollection = createCollection(
  indexedDBCollectionOptionsV2({
    // Unique identifier for this collection
    id: 'analytics-events',

    // Zod schema for validation
    schema: AnalyticsEventSchema,

    // Function to extract primary key from event
    getKey: (event: AnalyticsEvent) => event.id,

    // IndexedDB configuration
    kvStoreOptions: {
      // Database name
      dbName: 'analytics',

      // Store name within the database
      storeName: 'analytics_events',

      // Database version (increment when schema changes)
      version: 1,
    },

    // BroadcastChannel for multi-tab synchronization
    channelName: 'analytics-collection',

    // Optional custom JSON parser for serialization
    parser: JSON,

    /**
     * Hook called when events are inserted
     * Can be used for server sync, notifications, etc.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onInsert: async _params => {
      // Event mutations are stored in _params.transaction.mutations
      // Each mutation contains the inserted event data
      // Implement custom logic here (e.g., send to server, trigger notifications)
      return {};
    },

    /**
     * Hook called when events are updated
     * Can be used for server sync, notifications, etc.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onUpdate: async _params => {
      // Event mutations are stored in _params.transaction.mutations
      // Each mutation contains the updated event data
      // Implement custom logic here
      return {};
    },

    /**
     * Hook called when events are deleted
     * Can be used for server sync, notifications, etc.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDelete: async _params => {
      // Event mutations are stored in _params.transaction.mutations
      // Each mutation contains the deleted event data
      // Implement custom logic here
      return {};
    },
  })
);

/**
 * Type exports for the analytics collection
 * Provides access to utilities and the collection instance
 */
export type AnalyticsCollectionType = typeof analyticsCollection;
export type AnalyticsCollectionUtils = typeof analyticsCollection.utils;
