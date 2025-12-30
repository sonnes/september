# Analytics Package

Comprehensive analytics tracking for September, providing event logging, aggregation, and dashboard visualization of user interactions.

## Overview

The analytics package enables tracking of key user interactions:
- **Messages**: Text input, keystroke tracking
- **AI Generation**: LLM API calls, token usage, latency by provider
- **TTS Generation**: Text-to-speech calls, audio duration, latency by provider

Events are stored in IndexedDB with real-time aggregation using TanStack DB live queries.

## Architecture

### Event System

Events follow a discriminated union pattern with three main types:

#### MessageSentEvent
Logged when a user sends a message. Tracks:
- Message metrics (length)
- Keystroke data (physical + virtual keyboard)

```typescript
{
  event_type: 'message_sent',
  data: {
    text_length: number,
    keys_typed: number,           // Total keystrokes
    chat_id?: string,
  }
}
```

#### AIGenerationEvent
Logged after AI content generation. Tracks:
- Provider (gemini)
- Model used
- Input/output token counts or text lengths
- Generation latency
- Success status

```typescript
{
  event_type: 'ai_generation',
  data: {
    generation_type: 'suggestions' | 'transcription' | 'summary',
    provider: 'gemini',
    model: string,
    input_length: number,
    output_length: number,
    latency_ms: number,
    success: boolean,
  }
}
```

#### TTSGenerationEvent
Logged after TTS generation. Tracks:
- Provider (elevenlabs)
- Voice ID used
- Text length
- Audio duration estimate
- Generation latency

```typescript
{
  event_type: 'tts_generation',
  data: {
    provider: 'elevenlabs',
    voice_id?: string,
    text_length: number,
    duration_seconds: number,
    latency_ms: number,
    success: boolean,
  }
}
```

### Storage

Events are persisted in IndexedDB with:
- **Database**: `app-analytics`
- **Object Store**: `analytics_events`
- **Sync**: BroadcastChannel for cross-tab real-time synchronization

### Aggregation

The `useAnalyticsSummary` hook provides real-time aggregated metrics:

```typescript
{
  messages: {
    total_messages: number,
    avg_text_length: number,
  },
  ai_generations: {
    total_generations: number,
    success_rate: number,
    avg_input_length: number,
    avg_output_length: number,
    avg_latency_ms: number,
    by_provider: {
      [provider]: {
        count: number,
        success_count: number,
        avg_latency_ms: number,
      }
    }
  },
  tts_generations: {
    total_generations: number,
    success_rate: number,
    avg_text_length: number,
    avg_duration_seconds: number,
    avg_latency_ms: number,
    by_provider: {
      [provider]: {
        count: number,
        success_count: number,
        avg_latency_ms: number,
      }
    }
  },
  unique_users: number,
  date_range: { start_date: Date, end_date: Date },
}
```

## Usage

### Logging Events

Import logging functions from the analytics package:

```typescript
import { logMessageSent, logAIGeneration, logTTSGeneration } from '@/packages/analytics';

// Log message sent
logMessageSent(userId, {
  text_length: message.length,
  keys_typed: 42,
  chat_id: '...',
});

// Log AI generation
logAIGeneration(userId, {
  generation_type: 'suggestions',
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  input_length: 250,
  output_length: 150,
  latency_ms: 450,
  success: true,
});

// Log TTS generation
logTTSGeneration(userId, {
  provider: 'elevenlabs',
  voice_id: 'voice-123',
  text_length: 120,
  duration_seconds: 3.2,
  latency_ms: 800,
  success: true,
});
```

### Querying Analytics

Use the `useAnalyticsSummary` hook to get real-time aggregated data:

```typescript
import { useAnalyticsSummary } from '@/packages/analytics';

function AnalyticsDashboard() {
  const { data, isLoading } = useAnalyticsSummary({ range: 'week' });

  if (isLoading) return <Skeleton />;

  return (
    <div>
      <p>Messages Sent: {data?.messages.total_messages}</p>
      <p>Avg Length: {data?.messages.avg_text_length}</p>
      <p>AI Calls: {data?.ai_generations.total_generations}</p>
    </div>
  );
}
```

### Dashboard Components

Pre-built components for analytics visualization:

```typescript
import {
  DashboardStats,
  MetricCard,
  TimeRangeSelector,
  ProviderUsageChart,
} from '@/packages/analytics';

// Full dashboard
<DashboardStats />

// Individual components
<MetricCard title="Messages" value={42} format="number" />
<TimeRangeSelector value="week" onChange={setRange} />
<ProviderUsageChart title="AI Usage" data={aiByProvider} valueKey="tokens" />
```

## Keystroke Tracking

Keystroke data combines inputs from:
- **Physical Keyboard**: `onKeyDown` handler in Editor component
- **Virtual Keyboards**: Button presses in chat/talk pages

The `useEditorContext` provides:
- `trackKeystroke()`: Increment keystroke counter
- `getAndResetStats()`: Retrieve and reset keystroke counts

Flow:
1. Editor component calls `trackKeystroke()` for each physical key press
2. Virtual keyboard buttons call `trackKeystroke()` for each button press
3. On message submission, `getAndResetStats()` retrieves the accumulated stats
4. Stats are passed through `createMessage` to analytics logging

## Performance Considerations

- **Fire-and-forget logging**: Logging operations don't block message submission
- **Live queries**: Aggregation runs in background, subscribed components re-render on data changes
- **IndexedDB persistence**: Events persist across page reloads and sessions
- **Cross-tab sync**: BroadcastChannel keeps analytics consistent across browser tabs

## Testing

To verify analytics are working:

1. Open Developer Tools → Application → IndexedDB → `app-analytics`
2. Type in the editor and send messages
3. Check `analytics_events` object store for `message_sent` events
4. Trigger AI suggestions and TTS to see corresponding events
5. Visit `/dashboard` to see real-time metrics

Expected data:
- `keys_typed` increases with each keystroke
- `latency_ms` shows generation time for AI/TTS

## Future Enhancements

- Export analytics data (CSV, JSON)
- Advanced filtering by date range, event type, user segment
- Analytics API for external tools
- Real-time alerts for performance metrics
- Batch event upload to server (currently client-only)
