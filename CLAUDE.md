# CLAUDE.md

Project orientation for Claude Code when working with September codebase.

## What is September?

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. It helps users communicate effectively with fewer keystrokes through AI-powered autocomplete, real-time transcription, and contextual suggestions.

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS 4, shadcn/ui components ([docs](https://ui.shadcn.com/llms.txt))
- **Database**: Supabase (cloud: auth, storage, shared data)
- **AI**: Google Gemini API, Vercel AI SDK
- **Voice**: ElevenLabs (TTS, voice cloning)
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: pnpm (workspace monorepo)

## Project Structure

This is a **pnpm workspace monorepo** with apps and shared packages.

```
september/
├── apps/
│   └── web/                    # Next.js web app
│       ├── app/                # App Router pages
│       ├── components/         # Web-specific components (sidebar, home, context)
│       ├── services/           # Server-side integrations
│       └── package.json
├── packages/
│   ├── shared/                 # @september/shared - Utils, hooks, types
│   │   ├── lib/               # Utility functions (indexeddb, utils)
│   │   ├── hooks/             # Shared React hooks
│   │   └── types/             # TypeScript types
│   ├── ui/                     # @september/ui - shadcn/ui components
│   ├── account/               # @september/account - User account & DB sync
│   ├── ai/                    # @september/ai - AI config & service registry
│   ├── analytics/             # @september/analytics - Usage analytics
│   ├── audio/                 # @september/audio - Audio playback & storage
│   ├── chats/                 # @september/chats - Chat & message management
│   ├── cloning/               # @september/cloning - Voice cloning
│   ├── documents/             # @september/documents - Document management
│   ├── editor/                # @september/editor - Autocomplete text editor
│   ├── keyboards/             # @september/keyboards - Accessible keyboards
│   ├── onboarding/            # @september/onboarding - User onboarding
│   ├── recording/             # @september/recording - Audio recording
│   ├── speech/                # @september/speech - TTS & voice management
│   └── suggestions/           # @september/suggestions - Contextual suggestions
├── pnpm-workspace.yaml         # Workspace config
└── package.json                # Root package.json
```

## Development

```bash
# From workspace root
pnpm install                      # Install all dependencies
pnpm --filter @september/web dev  # Start web app dev server
pnpm --filter @september/web build # Build web app
pnpm --filter @september/web lint  # Lint web app
```

## Code Patterns

**Packages**: All shared code lives in `packages/` as workspace packages with `@september/*` naming:

- Import shared utilities: `import { cn } from "@september/shared/lib/utils"`
- Import UI components: `import { Button } from "@september/ui/components/button"`
- Import domain packages: `import { useAccount } from "@september/account"`

**Package Structure**: Each package should have:

- `components/`: Context providers, forms, and feature-specific UI.
- `hooks/`: State management and domain logic (e.g., `use-db-*`, `use-auth-*`, `use-ai-*`).
- `lib/`: Package-specific utility functions and services.
- `types/`: Zod schemas and TypeScript interfaces.
- `index.ts`: Public API for the package.
- `package.json`: Package manifest with `workspace:*` dependencies.
- `README.md`: Architectural decisions and usage guides.

**Forms**: Always use `react-hook-form` with `zodResolver` for validation. Use form components from `@september/ui/components/form`.

**Styling**: Use shadcn/ui components with Tailwind CSS. Font family is Noto Sans.

**Error Handling**:

- **Query Hooks** (read operations): Return error object: `{ data, isLoading, error }`. Error shape: `{ message: string }`.
- **Mutation Hooks** (write operations): Throw errors for component error boundaries. Use toast notifications for user feedback. Log to console for debugging.
- **Return Types**: All hooks should have explicit return type interfaces for better IDE support and type safety.
- **Pattern**:

```typescript
interface UseOperationReturn {
  data: T | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useOperation(): UseOperationReturn {
  // ...
}
```

## Important

- Do what has been asked; nothing more, nothing less
- ALWAYS prefer editing existing files over creating new ones
- **READ and UPDATE the README.md in each module directory before and after making changes.**
- Follow the modular structure in `packages/` for new features or refactors.
- For architecture details, see [README.md](README.md).
