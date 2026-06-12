# Shared Package

Small shared primitives, hooks, and types used across September packages.

## Features

- **Utilities**: Common helper functions (`cn` for className merging, `MATCH_PUNCTUATION` for text boundaries, `timeAgo` for human-readable relative time strings)
- **Hooks**: Reusable React hooks for common patterns
- **Types**: Shared TypeScript types and Zod schemas
- **IndexedDB**: Local storage utilities with TanStack DB, exported from `@september/shared/indexeddb`
- **Autocomplete**: Trie-based autocomplete engine, exported from `@september/shared/autocomplete`

## Structure

```
packages/shared/
├── lib/
│   ├── utils.ts              # cn() and other utilities
│   ├── indexeddb/            # IndexedDB collection helpers
│   └── autocomplete/         # Autocomplete engine
├── hooks/
│   ├── use-debounce.ts       # Debounced value hook
│   ├── use-mobile.ts         # Mobile detection hook
│   └── use-text.ts           # Text manipulation hook
├── types/
│   ├── grid.ts               # Grid layout types
│   ├── user.ts               # User-related types
│   ├── voice.ts              # Voice/speech types
│   ├── display.ts            # Display mode types
│   └── ai-config.ts          # AI configuration types
└── index.ts                  # Public exports
```

## Usage

### Utilities

```typescript
import { cn, timeAgo } from '@september/shared';

// Merge class names with Tailwind conflict resolution
<div className={cn('px-4 py-2', isActive && 'bg-blue-500')} />

// Human-readable relative time
timeAgo(message.created_at) // "2 minutes ago"
```

### Hooks

```typescript
import { useDebounce, useIsMobile } from '@september/shared';

// Debounce a value
const debouncedSearch = useDebounce(searchQuery, 300);

// Detect mobile viewport
const isMobile = useIsMobile();
```

### Types

```typescript
import { AIProvider, SpeechConfig, VoiceSettings } from '@september/shared';

const provider: AIProvider = 'gemini';

const speech: SpeechConfig = {
  provider: 'gemini',
};
```

### Explicit Subpath Imports

Use explicit subpaths for heavier purpose-built modules:

```typescript
import { tokenize } from '@september/shared/autocomplete';
import { indexedDBCollectionOptionsV2 } from '@september/shared/indexeddb';
import { parseAndRenderSlides } from '@september/shared/slides';
```

Keep the root import for broadly useful primitives only: `cn`, simple hooks,
and shared pure types. Feature hooks that depend on account, chats, audio, or UI
belong in their owning feature package.

## Dependencies

- `clsx` + `tailwind-merge` - Class name utilities
- `zod` - Schema validation
- `@tanstack/db` - Local-first database
- `lodash` - Utility functions
- `nanoid` - ID generation
