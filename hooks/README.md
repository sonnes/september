# Hooks Directory

This directory contains custom React hooks that encapsulate business logic, side effects, and state management.

## Purpose

Custom hooks provide reusable logic that can be shared across components. They handle:

- Data fetching and mutations
- Side effects and subscriptions
- Complex state management
- Integration with services and external APIs

## Available Hooks

### AI & Autocomplete

**[use-ai-settings.ts](use-ai-settings.ts)** - AI corpus generation and management

- `useCorpus()` - Generate personalized AI corpus from persona
- Integrates with [Gemini Service](../services/gemini.ts)
- Returns: `{ isGenerating, generateCorpus }`

**[use-autocomplete.ts](use-autocomplete.ts)** - Text autocomplete and predictions

- `useAutocomplete()` - Word completion and next-word prediction
- Trains on user messages + AI corpus + static dictionary
- Uses [Autocomplete library](../lib/autocomplete/)
- Returns: `{ isReady, getSpellings, getNextWords }`

**Key Features**:

- Caches static data (dictionary, default corpus)
- Retrains on user data changes
- Provides word spelling suggestions
- Predicts next words based on context

### Documents & Text

**[use-documents.ts](use-documents.ts)** - Document management

- Document CRUD operations
- Document list fetching
- Integration with document storage

**[use-text.ts](use-text.ts)** - Text editing state

- Text content management
- Editor state synchronization
- Content persistence

### Messages

**[use-messages.ts](use-messages.ts)** - Message operations (deprecated)

- Legacy message hook
- Prefer using [services/messages/use-supabase.tsx](../services/messages/use-supabase.tsx) instead

### Audio

**[use-audio-player.tsx](use-audio-player.tsx)** - Audio playback management

- Audio player state
- Playback controls (play, pause, stop)
- Audio queue management
- Progress tracking

**Key Features**:

- Single audio instance management
- Automatic cleanup on unmount
- Event-driven playback state

### Suggestions

**[use-suggestions.ts](use-suggestions.ts)** - Typing suggestions

- Real-time suggestion generation
- Suggestion ranking and filtering
- Integration with autocomplete

### UI Utilities

**[use-toast.tsx](use-toast.tsx)** - Toast notification management

- `useToast()` - Show success, error, and info messages
- Returns: `{ showToast, showSuccess, showError }`
- Uses Sonner library for notifications

**[use-debounce.ts](use-debounce.ts)** - Debounced values

- `useDebounce<T>(value: T, delay: number)` - Debounce any value
- Useful for search inputs and API calls
- Returns debounced value

## Usage Patterns

### Basic Hook Usage

```typescript
import { useAutocomplete } from '@/hooks/use-autocomplete';

function MyComponent() {
  const { isReady, getSpellings, getNextWords } = useAutocomplete();

  if (!isReady) return <div>Loading...</div>;

  const suggestions = getSpellings('hel'); // ['hello', 'help', 'held']
}
```

### With Service Integration

```typescript
import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';

function MyComponent() {
  const { account, updateAccount } = useAccount();
  const { showSuccess, showError } = useToast();

  const handleSave = async () => {
    try {
      await updateAccount({ name: 'New Name' });
      showSuccess('Settings saved');
    } catch (error) {
      showError('Failed to save settings');
    }
  };
}
```

### Debouncing Search

```typescript
import { useEffect, useState } from 'react';

import { useDebounce } from '@/hooks/use-debounce';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Only runs when debounced value changes
    searchAPI(debouncedQuery);
  }, [debouncedQuery]);
}
```

## Hook Guidelines

### When to Create a Hook

Create a custom hook when:

- Logic is reused across multiple components
- Complex state management needs encapsulation
- Side effects need cleanup
- Service integration needs a component interface

### Hook Naming

All hooks must:

- Start with `use` prefix (React convention)
- Use descriptive names: `useAutocomplete`, not `useAC`
- Use kebab-case for file names: `use-autocomplete.ts`

### Hook Organization

Hooks should:

- Be pure functions that return values and functions
- Handle their own loading and error states
- Clean up side effects in cleanup functions
- Use TypeScript for type safety

### Error Handling

All hooks should:

- Use try-catch for async operations
- Show user-friendly error messages via toast
- Return error states when appropriate
- Log errors to console for debugging

## Related Documentation

- [Services Directory](../services/README.md) - Backend integration
- [Components Directory](../components/README.md) - UI components that use hooks
- [Lib Directory](../lib/README.md) - Utility functions used by hooks
