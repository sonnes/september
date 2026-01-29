# Shared Package

Shared utilities, hooks, and types used across all September packages.

## Features

- **Utilities**: Common helper functions (`cn` for className merging)
- **Hooks**: Reusable React hooks for common patterns
- **Types**: Shared TypeScript types and Zod schemas
- **IndexedDB**: Local storage utilities with TanStack DB
- **Autocomplete**: Trie-based autocomplete engine

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
│   ├── use-text.ts           # Text manipulation hook
│   └── use-autocomplete.ts   # Autocomplete hook
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
import { cn } from '@september/shared';

// Merge class names with Tailwind conflict resolution
<div className={cn('px-4 py-2', isActive && 'bg-blue-500')} />
```

### Hooks

```typescript
import { useDebounce, useMobile } from '@september/shared';

// Debounce a value
const debouncedSearch = useDebounce(searchQuery, 300);

// Detect mobile viewport
const isMobile = useMobile();
```

### Types

```typescript
import { GridConfig, VoiceSettings, AIConfig } from '@september/shared';

const config: AIConfig = {
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
};
```

### Direct Subpath Imports

For specific modules, use subpath imports:

```typescript
import { cn } from '@september/shared/lib/utils';
import { useDebounce } from '@september/shared/hooks/use-debounce';
import { VoiceSettings } from '@september/shared/types/voice';
```

## Dependencies

- `clsx` + `tailwind-merge` - Class name utilities
- `zod` - Schema validation
- `@tanstack/db` - Local-first database
- `lodash` - Utility functions
- `nanoid` - ID generation
