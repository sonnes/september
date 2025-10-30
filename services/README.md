# Services Directory

This directory contains the service layer that handles all external integrations and business logic.

## Purpose

Service classes provide a clean abstraction layer between components/hooks and external APIs, databases, and integrations. This follows the Repository pattern for data access and Service pattern for business logic.

## Architecture Pattern

### Domain-Specific Services

Each domain follows this structure:

```
{domain}/
├── index.ts           # Exports all domain functionality
├── supabase.ts        # Service class for Supabase operations
├── context.tsx        # React Context provider for client state
├── use-supabase.tsx   # Hook for Supabase database operations
└── use-triplit.tsx    # Hook for Triplit (local) operations
```

### Service Responsibilities

**Service Classes** (`supabase.ts`):

- CRUD operations
- Database queries
- Data transformations
- Error handling
- Type safety

**Context Providers** (`context.tsx`):

- Client-side state management
- Real-time subscriptions
- State synchronization
- Provider wrapper for React tree

**Hooks** (`use-*.tsx`):

- Component interface to services
- Loading states
- Error handling
- Data caching
- Reactive updates

## Domain Services

### Messages Service

**[messages/](messages/)** - Message storage and retrieval

- [supabase.ts](messages/supabase.ts) - Message CRUD with full-text search
- [context.tsx](messages/context.tsx) - Messages state and real-time updates
- [use-supabase.tsx](messages/use-supabase.tsx) - Hook for authenticated message operations
- [use-triplit.tsx](messages/use-triplit.tsx) - Hook for local-only message storage

**Key Features**:

- Full-text search with preprocessing
- Audio attachment links
- Real-time message updates via Supabase Realtime
- Pagination support

### Account Service

**[account/](account/)** - User account and settings management

- [supabase.ts](account/supabase.ts) - Account data and preferences
- [context.tsx](account/context.tsx) - Account state provider
- [use-supabase.tsx](account/use-supabase.tsx) - Hook for account operations
- [use-triplit.tsx](account/use-triplit.tsx) - Hook for local account data

**Key Features**:

- AI corpus and persona management
- Speech preferences (provider, voice, speed)
- User profile management

### Audio Service

**[audio/](audio/)** - Audio file storage and management

- [supabase.ts](audio/supabase.ts) - Audio file upload/download from Supabase Storage
- [context.tsx](audio/context.tsx) - Audio state provider
- [use-supabase.tsx](audio/use-supabase.tsx) - Hook for audio operations
- [use-triplit.tsx](audio/use-triplit.tsx) - Hook for local audio data

**Key Features**:

- Audio file upload to Supabase Storage
- Audio URL generation with signed URLs
- Audio metadata management
- Link audio to messages

### Speech Service

**[speech/](speech/)** - Text-to-speech abstraction layer

- [index.ts](speech/index.ts) - Main speech service exports
- [types.ts](speech/types.ts) - Speech provider interfaces
- [context.tsx](speech/context.tsx) - Speech state and playback
- [use-speech.tsx](speech/use-speech.tsx) - Hook for TTS operations
- [provider-browser.ts](speech/provider-browser.ts) - Browser Web Speech API
- [provider-elevenlabs.ts](speech/provider-elevenlabs.ts) - ElevenLabs TTS
- [provider-gemini.ts](speech/provider-gemini.ts) - Google Gemini TTS

**Key Features**:

- Multiple TTS provider support
- Provider abstraction interface
- Voice selection per provider
- Speech rate and pitch control
- Audio playback queue

## External Integration Services

### Gemini Service

**[gemini.ts](gemini.ts)** - Google Gemini AI integration

- AI text generation
- Corpus generation from persona
- Context-aware completions

**Key Methods**:

- `generateCorpusFromPersona(persona: string)` - Generate training corpus
- `generateText(prompt: string)` - Generate AI text

### ElevenLabs Service

**[elevenlabs.ts](elevenlabs.ts)** - ElevenLabs voice synthesis

- Voice cloning from audio samples
- High-quality text-to-speech
- Voice management

**Key Methods**:

- `generateSpeech({ text, voiceId, modelId })` - Convert text to speech
- `cloneVoice({ name, files, description })` - Clone voice from samples
- `getVoices()` - List available voices

## Usage Patterns

### Using Domain Services in Components

```typescript
// 1. Wrap component tree with provider
import { MessagesProvider } from '@/services/messages';
// 2. Use hook in component
import { useMessagesSupabase } from '@/services/messages';

function MyComponent() {
  const { messages, addMessage, loading } = useMessagesSupabase();
  // ... use messages
}
```

### Direct Service Usage in Server Components

```typescript
import { MessagesService } from '@/services/messages';

import { createClient } from '@/supabase/server';

async function ServerComponent() {
  const supabase = await createClient();
  const service = new MessagesService(supabase);
  const messages = await service.getMessages();
  // ... use messages
}
```

### Using External Services

```typescript
import GeminiService from '@/services/gemini';

const gemini = new GeminiService(process.env.GEMINI_API_KEY);
const corpus = await gemini.generateCorpusFromPersona(persona);
```

## Data Flow

**Authenticated Users**:

1. Component calls hook
2. Hook uses Context state
3. Context updates via Service class
4. Service class calls Supabase API
5. Data persisted to cloud database

**Unauthenticated Users**:

1. Component calls hook
2. Hook uses Triplit service
3. Triplit stores data locally
4. No cloud synchronization

## Related Documentation

- [Hooks Directory](../hooks/README.md) - Component hooks that use services
- [Supabase Configuration](../supabase/README.md) - Database setup
- [Triplit Configuration](../triplit/README.md) - Local database
- [API Routes](../app/api/README.md) - Server-side service usage
