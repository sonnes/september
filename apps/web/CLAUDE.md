# CLAUDE.md — Web App

Project orientation for Claude Code when working on `apps/web/`.

## What is this?

September's Next.js web app — the primary user-facing interface for assistive communication. Users type, talk, and write through AI-powered autocomplete, real-time transcription, and contextual suggestions.

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS 4, shadcn/ui components ([docs](https://ui.shadcn.com/llms.txt))
- **Database**: Supabase (auth, storage, shared data)
- **AI**: Google Gemini API, Vercel AI SDK
- **Voice**: ElevenLabs (TTS, voice cloning)
- **Forms**: React Hook Form + Zod validation

## Structure

```
apps/web/
├── app/                # App Router pages
├── components/         # Web-specific components (sidebar, home, context)
├── services/           # Server-side integrations
└── package.json
```

## Development

```bash
pnpm --filter @september/web dev    # Start dev server
pnpm --filter @september/web build  # Build
pnpm --filter @september/web lint   # Lint
```

## Code Patterns

**Imports from shared packages:**
```typescript
import { cn } from "@september/shared/lib/utils"
import { Button } from "@september/ui/components/button"
import { useAccount } from "@september/account"
```

**Forms**: Always use `react-hook-form` with `zodResolver`. Use form components from `@september/ui/components/form`.

**Styling**: Use shadcn/ui components with Tailwind CSS. Font family is Noto Sans.

**Error Handling:**
- **Query Hooks** (read operations): Return `{ data, isLoading, error }`. Error shape: `{ message: string }`.
- **Mutation Hooks** (write operations): Throw errors for error boundaries. Use toast for user feedback. Log to console.
- **Return Types**: All hooks should have explicit return type interfaces.

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
