# @/packages/usage

Client-side event tracking for the September app. Fire-and-forget event writes to IndexedDB; a live-query hook aggregates them for the dashboard.

## Public API

```ts
import { track, DashboardStats } from '@/packages/usage';
import type { TrackedEvent } from '@/packages/usage';
```

Everything else (`analyticsCollection`, `useAnalyticsSummary`, `aggregateByProvider`, individual components) is internal.

### `track(userId, event)`

Fire-and-forget. Returns `void`. Insert failures are caught and logged to `console.error`.

```ts
track(userId, { type: 'message_sent', text_length: 42, keys_typed: 10 });

track(userId, {
  type: 'ai_generation',
  input_length: 200, output_length: 150,
  latency_ms: 320, success: true,
});

track(userId, {
  type: 'tts_generation',
  text_length: 80, duration_seconds: 3.1,
  latency_ms: 600, success: true,
});
```

### `TrackedEvent`

Discriminated union on `type`:

| type | required fields | optional fields |
|---|---|---|
| `message_sent` | `text_length` | `chat_id`, `keys_typed` (default 0) |
| `ai_generation` | `input_length`, `output_length`, `latency_ms`, `success` | `generation_type` (default `suggestions`), `provider` (default `gemini`), `model` (default `gemini-2.5-flash-lite`), `error_message` |
| `tts_generation` | `text_length`, `duration_seconds`, `latency_ms`, `success` | `provider` (default `elevenlabs`), `voice_id`, `error_message` |

### `DashboardStats`

Pre-built analytics dashboard component. Accepts `userId?: string`.

```tsx
<DashboardStats userId={user?.id} />
```

## Stored-data model

Events are stored in IndexedDB with this shape (backwards-compatible; do not change without a migration):

```
{ id: uuid, user_id: string, event_type: string, timestamp: Date, data: {...} }
```

- **Database:** `analytics`
- **Store:** `analytics_events`
- **Version:** 1
- **Collection id:** `analytics-events`
- **BroadcastChannel:** `analytics-collection`
