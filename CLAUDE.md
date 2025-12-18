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
├── app/                 # Next.js App Router pages
│   ├── talk/           # Main communication interface
│   ├── settings/       # App settings (AI, speech)
│   ├── api/            # Server-side API routes
│   └── auth/           # Authentication callbacks
├── components/         # React components (organized by feature)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and libraries
│   └── autocomplete/   # Custom autocomplete implementation
├── services/           # External service integrations
├── supabase/           # Cloud database config & migrations
├── triplit/            # Local-first database schema
└── types/              # TypeScript type definitions
```

## Development

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm run lint     # Run ESLint
```

## Code Patterns

**Forms**: Always use `react-hook-form` with `zodResolver` for validation. Use form components from [components/ui/form.tsx](components/ui/form.tsx).

**Styling**: Use shadcn/ui components with Tailwind CSS. Font family is Noto Sans.

**Components**: Read directory READMEs before working in any major directory (app/, components/, lib/, services/).

## Important

- Do what has been asked; nothing more, nothing less
- ALWAYS prefer editing existing files over creating new ones
- Read directory READMEs before making changes
- For architecture details, see [README.md](README.md)
