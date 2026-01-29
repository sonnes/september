# Types Directory

This directory contains all TypeScript type definitions and interfaces used throughout the September application.

## Purpose

Centralized type definitions ensure:

- Type safety across the application
- Consistent data structures
- Better IDE autocomplete and documentation
- Easier refactoring and maintenance

## Type Files

### Core Data Models

**[packages/chats/types/message.ts](../packages/chats/types/message.ts)** - Message type definitions

- `Message` - Complete message with all fields
- `CreateMessageData` - Data for creating new messages

**Key Fields**:

- `id`, `text`, `type` (user/ai/system)
- `user_id` - Owner of the message
- `audio_path`, `audio` - Optional audio attachment
- `created_at` - Timestamp

**[account.ts](account.ts)** - User account type definitions

- `Account` - Complete user account with all settings
- `PutAccountData` - Partial account data for updates
- `BrowserTTSSettings` - Browser speech synthesis settings
- `ElevenLabsSettings` - ElevenLabs TTS configuration
- `GeminiSpeechSettings` - Gemini TTS configuration

**Key Sections**:

- Personal information (name, city, country)
- Medical information (diagnosis, medical documents)
- AI configurations (suggestions, transcription, speech)
- Provider configurations
- Feature flags (terms accepted, onboarding)
- Timestamps

**[document.ts](document.ts)** - Document type definitions

- Document management types
- Document metadata and content structures

**[audio.ts](audio.ts)** - Audio file type definitions

- Audio metadata
- Storage paths and URLs
- Audio attachment structures

**[user.ts](user.ts)** - User authentication types

- User profile types
- Authentication-related types

### Feature-Specific Types

**[voice.ts](voice.ts)** - Voice and TTS types

- Voice selection interfaces
- Voice provider configurations
- Voice cloning types

**[suggestion.ts](suggestion.ts)** - Autocomplete and suggestion types

- Suggestion result structures
- Autocomplete configurations
- Next-word prediction types

**[grid.ts](grid.ts)** - Keyboard grid types

- Alternative keyboard layouts
- Grid cell definitions
- Keyboard interaction types

**[ai-config.ts](ai-config.ts)** - AI configuration types

- `SuggestionsConfig` - AI-powered suggestion settings
- `TranscriptionConfig` - Speech-to-text settings
- `SpeechConfig` - Text-to-speech settings
- `ProviderConfig` - API provider configurations

## Type Patterns

### Database Types

Types mirror Supabase database schema:

- Match table column names exactly
- Include all required and optional fields
- Use TypeScript native types (Date, not string)
- Include relationships (e.g., message.audio)

### Creation Types

For creating new records, use partial types:

```typescript
// Full type
export interface Message {
  id: string;
  text: string;
  user_id: string;
  created_at: Date;
}

// Creation type (id and timestamps auto-generated)
export interface CreateMessageData {
  id?: string;
  text: string;
  user_id: string;
}
```

### Update Types

For updating records, use `Partial<>` utility:

```typescript
export type PutAccountData = Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>;
```

This allows updating any field except system-managed ones.

### Settings Types

Complex settings are structured as nested interfaces:

```typescript
export interface Account {
  ai_speech?: SpeechConfig;
  ai_suggestions?: SuggestionsConfig;
  ai_providers?: ProviderConfig;
}
```

## Usage Guidelines

### Import Types

Always import types explicitly:

```typescript
import { Account, PutAccountData } from '@/types/account';
import { CreateMessageData, Message } from '@/packages/chats';
```

### Type vs Interface

**Use `interface`** for:

- Object shapes
- Types that can be extended
- Public API types

**Use `type`** for:

- Unions and intersections
- Utility type transformations
- Type aliases

### Optional vs Required

Mark fields as optional (`?`) when:

- Field can be null or undefined in database
- Field is auto-generated (e.g., timestamps)
- Field is set after creation

### Naming Conventions

- **Interfaces**: PascalCase (e.g., `Message`, `Account`)
- **Type aliases**: PascalCase (e.g., `PutAccountData`)
- **Settings interfaces**: Suffix with "Settings" or "Config"
- **Creation types**: Prefix with "Create" or suffix with "Data"

## Type Safety Best Practices

### Avoid `any`

Never use `any` type. Use:

- `unknown` for truly unknown values
- Generic types for flexible types
- Union types for multiple possibilities

### Use Strict Types

Enable strict TypeScript settings:

- `strictNullChecks: true`
- `strictFunctionTypes: true`
- `noImplicitAny: true`

### Document Complex Types

Add JSDoc comments for complex types:

```typescript
/**
 * User account with all settings and configurations.
 * Includes AI settings, speech preferences, and medical information.
 */
export interface Account {
  // ...
}
```

### Type Guards

Create type guards for runtime type checking:

```typescript
export function isMessage(obj: any): obj is Message {
  return obj && typeof obj.text === 'string' && typeof obj.user_id === 'string';
}
```

## Database Schema Sync

Types should match database schema exactly:

1. After database migrations, update corresponding types
2. Use Supabase type generation when possible
3. Keep deprecated fields for backward compatibility
4. Document breaking changes

See [../supabase/migrations/](../supabase/migrations/) for schema changes.

## Related Documentation

- [Services Directory](../services/README.md) - Services that use these types
- [Supabase Directory](../supabase/README.md) - Database schema
- [Hooks Directory](../hooks/README.md) - Hooks that return typed data
