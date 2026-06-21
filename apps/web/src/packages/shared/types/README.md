# Types Directory

This directory contains pure TypeScript type definitions and interfaces shared across September packages.

## Purpose

Centralized type definitions ensure:

- Type safety for cross-package primitives
- Consistent data structures
- Better IDE autocomplete and documentation
- Easier refactoring and maintenance

## Type Files

### Core Data Models

Chat message records live in `@/packages/spaces`; account records live in
`@/packages/account`. Shared types may define small structural payloads for
cross-package protocols, but must not import feature package types.

**[user.ts](user.ts)** - User authentication types

- User profile types
- Authentication-related types

**[display.ts](display.ts)** - Display popup protocol types

- Structural message payloads
- Character alignment payloads

### Feature-Specific Types

**[voice.ts](voice.ts)** - Voice and TTS types

- Voice selection interfaces
- Voice provider configurations
- Voice cloning types

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

Types mirror the data schema:

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
export type AccountUpdate = Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>;
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
import type { Account, AccountUpdate } from '@/packages/account';
import type { CreateMessageData, Message } from '@/packages/spaces';
import type { Voice } from '@/packages/shared';
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
- **Type aliases**: PascalCase (e.g., `AccountUpdate`)
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

### Note Complex Types

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

1. After schema changes, update corresponding types
2. Keep deprecated fields for backward compatibility
3. Note breaking changes

## Related Documentation

- [Services Directory](../services/README.md) - Services that use these types
- [Hooks Directory](../hooks/README.md) - Hooks that return typed data
