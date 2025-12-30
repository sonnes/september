# Analytics Plan 1: Core Infrastructure

> **For Claude:** Implement this plan task-by-task.

**Date**: 2025-12-30
**Scope**: Create the `packages/analytics/` module with types, database, and hooks
**Dependencies**: None
**Estimated Files**: 7 new files

---

## Overview

Create the foundational analytics package with:

- Zod event schemas (3 event types)
- IndexedDB collection
- Event tracking hook
- Analytics summary hook (using TanStack DB Live Queries)
- Aggregation logic

---

## Tasks

### Task 1: Create package directory structure

Create the following directories:

```
packages/analytics/
├── components/
├── hooks/
├── lib/
└── types/
```

---

### Task 2: Define event schemas and types

**File**: `packages/analytics/types/index.ts`

```typescript
import { z } from 'zod';

// Base event schema
const BaseEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  timestamp: z.coerce.date(),
});

// Message sent event (includes keystroke data)
// keys_typed tracks ALL input: physical keyboard + virtual keyboards
const MessageSentEventSchema = BaseEventSchema.extend({
  event_type: z.literal('message_sent'),
  payload: z.object({
    chat_id: z.string().optional(),
    message_length: z.number(),
    has_audio: z.boolean(),
    message_type: z.string(),
    keys_typed: z.number(), // All key presses (physical + virtual keyboards)
    chars_saved: z.number(),
  }),
});

// AI generation event
const AIGenerationEventSchema = BaseEventSchema.extend({
  event_type: z.literal('ai_generation'),
  payload: z.object({
    provider: z.enum(['gemini', 'webllm']),
    model: z.string(),
    feature: z.enum(['suggestions', 'transcription', 'keyboard_generation', 'other']),
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// TTS generation event
const TTSGenerationEventSchema = BaseEventSchema.extend({
  event_type: z.literal('tts_generation'),
  payload: z.object({
    provider: z.enum(['elevenlabs', 'gemini', 'browser']),
    model: z.string().optional(),
    character_count: z.number(),
  }),
});

// Discriminated union
export const AnalyticsEventSchema = z.discriminatedUnion('event_type', [
  MessageSentEventSchema,
  AIGenerationEventSchema,
  TTSGenerationEventSchema,
]);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type MessageSentEvent = z.infer<typeof MessageSentEventSchema>;
export type AIGenerationEvent = z.infer<typeof AIGenerationEventSchema>;
export type TTSGenerationEvent = z.infer<typeof TTSGenerationEventSchema>;

// Helper types for creating events
export type MessageSentPayload = MessageSentEvent['payload'];
export type AIGenerationPayload = AIGenerationEvent['payload'];
export type TTSGenerationPayload = TTSGenerationEvent['payload'];

// Aggregation Types
export type TimeRange = 'day' | 'week' | 'month';

export interface AnalyticsSummary {
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;

  // Message metrics
  messagesSent: number;
  messagesByType: Record<string, number>;

  // Keystroke metrics (from message_sent events)
  // keys_typed includes ALL input: physical keyboard + virtual keyboards
  keysTyped: number;
  charsSaved: number;
  efficiencyPercent: number;

  // AI usage
  aiGenerations: number;
  aiTokensUsed: number;
  aiByProvider: Record<string, { calls: number; tokens: number }>;

  // TTS usage
  ttsGenerations: number;
  ttsCharsProcessed: number;
  ttsByProvider: Record<string, { calls: number; chars: number }>;
}
```

---

### Task 3: Create IndexedDB collection

**File**: `packages/analytics/db.ts`

```typescript
import { createCollection } from '@tanstack/react-db';

import { indexedDBCollectionOptionsV2 } from '@/lib/indexeddb/collection-v2';

import { AnalyticsEventSchema } from './types';

export const analyticsCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: AnalyticsEventSchema,
    id: 'analytics-events',
    kvStoreOptions: {
      dbName: 'app-analytics',
    },
    channelName: 'app-analytics',
    getKey: item => item.id,
  })
);
```

---

### Task 4: Create event logging functions

**File**: `packages/analytics/lib/log-event.ts`

```typescript
import { analyticsCollection } from '../db';
import { AIGenerationPayload, MessageSentPayload, TTSGenerationPayload } from '../types';

/**
 * Log a message_sent event (fire-and-forget)
 */
export function logMessageSent(userId: string, payload: MessageSentPayload): void {
  analyticsCollection
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      timestamp: new Date(),
      event_type: 'message_sent',
      payload,
    })
    .catch(err => console.error('[Analytics] Failed to log message_sent:', err));
}

/**
 * Log an ai_generation event (fire-and-forget)
 */
export function logAIGeneration(userId: string, payload: AIGenerationPayload): void {
  analyticsCollection
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      timestamp: new Date(),
      event_type: 'ai_generation',
      payload,
    })
    .catch(err => console.error('[Analytics] Failed to log ai_generation:', err));
}

/**
 * Log a tts_generation event (fire-and-forget)
 */
export function logTTSGeneration(userId: string, payload: TTSGenerationPayload): void {
  analyticsCollection
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      timestamp: new Date(),
      event_type: 'tts_generation',
      payload,
    })
    .catch(err => console.error('[Analytics] Failed to log tts_generation:', err));
}
```

---

### Task 5: Create utility functions

**File**: `packages/analytics/lib/utils.ts`

```typescript
import { TimeRange } from '../types';

export function getTimeRangeBounds(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}
```

---

### Task 6: Create analytics summary hook

**File**: `packages/analytics/hooks/use-analytics-summary.ts`

```typescript
import { useMemo } from 'react';

import { and, count, eq, gte, lte, sum, useLiveQuery } from '@tanstack/react-db';

import { useAccountContext } from '@/packages/account';

import { analyticsCollection } from '../db';
import { getTimeRangeBounds } from '../lib/utils';
import {
  AIGenerationEvent,
  AnalyticsSummary,
  MessageSentEvent,
  TTSGenerationEvent,
  TimeRange,
} from '../types';

export interface UseAnalyticsSummaryParams {
  range: TimeRange;
}

export interface UseAnalyticsSummaryReturn {
  data: AnalyticsSummary | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useAnalyticsSummary(params: UseAnalyticsSummaryParams): UseAnalyticsSummaryReturn {
  const { range } = params;
  const { user } = useAccountContext();
  const { start, end } = useMemo(() => getTimeRangeBounds(range), [range]);

  // Query 1: Message Metrics
  const messagesQuery = useLiveQuery(
    q => {
      // Note: We need to cast to any or the specific event type to access payload fields in aggregations
      // because TypeScript might not infer the union narrowing in the select/groupBy clauses automatically.
      return q
        .from(analyticsCollection)
        .where(e =>
          and(
            eq(e.user_id, user?.id ?? ''),
            eq(e.event_type, 'message_sent'),
            gte(e.timestamp, start),
            lte(e.timestamp, end)
          )
        )
        .groupBy(e => (e.payload as any).message_type)
        .select(e => ({
          type: (e.payload as any).message_type as string,
          count: count(e.id),
          keys: sum((e.payload as any).keys_typed),
          saved: sum((e.payload as any).chars_saved),
        }));
    },
    [user?.id, start, end]
  );

  // Query 2: AI Metrics
  const aiQuery = useLiveQuery(
    q =>
      q
        .from(analyticsCollection)
        .where(e =>
          and(
            eq(e.user_id, user?.id ?? ''),
            eq(e.event_type, 'ai_generation'),
            gte(e.timestamp, start),
            lte(e.timestamp, end)
          )
        )
        .groupBy(e => (e.payload as any).provider)
        .select(e => ({
          provider: (e.payload as any).provider as string,
          calls: count(e.id),
          tokens: sum((e.payload as any).total_tokens),
        })),
    [user?.id, start, end]
  );

  // Query 3: TTS Metrics
  const ttsQuery = useLiveQuery(
    q =>
      q
        .from(analyticsCollection)
        .where(e =>
          and(
            eq(e.user_id, user?.id ?? ''),
            eq(e.event_type, 'tts_generation'),
            gte(e.timestamp, start),
            lte(e.timestamp, end)
          )
        )
        .groupBy(e => (e.payload as any).provider)
        .select(e => ({
          provider: (e.payload as any).provider as string,
          calls: count(e.id),
          chars: sum((e.payload as any).character_count),
        })),
    [user?.id, start, end]
  );

  const isLoading = messagesQuery.isLoading || aiQuery.isLoading || ttsQuery.isLoading;

  const data: AnalyticsSummary | undefined = useMemo(() => {
    if (!user?.id || isLoading) return undefined;

    // Process Message Metrics
    let messagesSent = 0;
    let keysTyped = 0;
    let charsSaved = 0;
    const messagesByType: Record<string, number> = {};

    (messagesQuery.data || []).forEach(row => {
      messagesSent += row.count;
      keysTyped += row.keys;
      charsSaved += row.saved;
      messagesByType[row.type] = row.count;
    });

    const totalActivity = keysTyped + charsSaved;
    const efficiencyPercent = totalActivity > 0 ? (charsSaved / totalActivity) * 100 : 0;

    // Process AI Metrics
    let aiGenerations = 0;
    let aiTokensUsed = 0;
    const aiByProvider: Record<string, { calls: number; tokens: number }> = {};

    (aiQuery.data || []).forEach(row => {
      aiGenerations += row.calls;
      aiTokensUsed += row.tokens;
      aiByProvider[row.provider] = { calls: row.calls, tokens: row.tokens };
    });

    // Process TTS Metrics
    let ttsGenerations = 0;
    let ttsCharsProcessed = 0;
    const ttsByProvider: Record<string, { calls: number; chars: number }> = {};

    (ttsQuery.data || []).forEach(row => {
      ttsGenerations += row.calls;
      ttsCharsProcessed += row.chars;
      ttsByProvider[row.provider] = { calls: row.calls, chars: row.chars };
    });

    return {
      timeRange: range,
      startDate: start,
      endDate: end,
      messagesSent,
      messagesByType,
      keysTyped,
      charsSaved,
      efficiencyPercent,
      aiGenerations,
      aiTokensUsed,
      aiByProvider,
      ttsGenerations,
      ttsCharsProcessed,
      ttsByProvider,
    };
  }, [user?.id, isLoading, range, start, end, messagesQuery.data, aiQuery.data, ttsQuery.data]);

  return { data, isLoading };
}
```

---

### Task 7: Create public API exports

**File**: `packages/analytics/index.ts`

```typescript
// Types
export type {
  AnalyticsEvent,
  MessageSentEvent,
  AIGenerationEvent,
  TTSGenerationEvent,
  MessageSentPayload,
  AIGenerationPayload,
  TTSGenerationPayload,
  TimeRange,
  AnalyticsSummary,
} from './types';

// Logging functions
export { logMessageSent, logAIGeneration, logTTSGeneration } from './lib/log-event';

// Hooks
export { useAnalyticsSummary } from './hooks/use-analytics-summary';
export type { UseAnalyticsSummaryReturn } from './hooks/use-analytics-summary';

// Utils
export { getTimeRangeBounds } from './lib/utils';

// Collection (for advanced usage)
export { analyticsCollection } from './db';
```

---

## Validation

After completing all tasks:

1. Run `pnpm run lint` - should pass
2. Run `pnpm run build` - should compile
3. Check browser DevTools → Application → IndexedDB → `app-analytics` exists
4. Verify aggregations work by logging some events and checking the summary output

---

**END OF PLAN**
