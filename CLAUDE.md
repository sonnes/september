# CLAUDE.md

Project orientation for Claude Code when working with September codebase.

## What is September?

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. It helps users communicate effectively with fewer keystrokes through AI-powered autocomplete, real-time transcription, and contextual suggestions.

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS 4, shadcn/ui components ([docs](https://ui.shadcn.com/llms.txt))
- **Database**: Dual architecture
  - Supabase (cloud: auth, storage, shared data)
  - Triplit (local-first: SQLite, offline sync)
- **AI**: Google Gemini API, Vercel AI SDK
- **Voice**: ElevenLabs (TTS, voice cloning)
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: pnpm

## Project Structure

```
september/
├── app/                 # Next.js App Router pages (Composers for modules)
├── components/          # Reusable UI components (shadcn/ui in components/ui)
├── hooks/               # Global React hooks
├── lib/                 # Global utilities and libraries
├── packages/            # Modular features (Domain-driven)
│   ├── account/        # User account and DB synchronization
│   ├── ai/             # AI configuration and service registry
│   ├── audio/          # Audio playback and storage
│   ├── chats/          # Chat and message management
│   ├── cloning/        # Voice cloning functionality
│   ├── documents/      # Document and slide management
│   ├── editor/         # Autocomplete-enabled text editor
│   ├── keyboards/      # Custom accessible keyboards
│   ├── onboarding/     # User onboarding flow
│   ├── speech/         # TTS and voice management
│   └── suggestions/    # Contextual typing suggestions
├── services/           # External service integrations
├── supabase/           # Cloud database config & migrations
├── triplit/            # Local-first database schema
└── types/              # Global TypeScript type definitions
```

## Development

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm run lint     # Run ESLint
```

## Code Patterns

**Modules**: The codebase is organized into modular packages in `packages/`. Each package should have:

- `components/`: Context providers, forms, and feature-specific UI.
- `hooks/`: State management and domain logic (e.g., `use-db-*`, `use-auth-*`, `use-ai-*`).
- `lib/`: Package-specific utility functions and services.
- `types/`: Zod schemas and TypeScript interfaces.
- `index.ts`: Public API for the package.
- `README.md`: Architectural decisions and usage guides.

**Forms**: Always use `react-hook-form` with `zodResolver` for validation. Use form components from `components/ui/form.tsx`.

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
