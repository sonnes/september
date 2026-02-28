# CLAUDE.md

Project orientation for Claude Code when working with the September monorepo.

## What is September?

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. It helps users type, talk, and write with fewer keystrokes through AI-powered autocomplete and contextual suggestions.

## Monorepo Structure

This is a **pnpm workspace monorepo** with apps and shared packages.

```
september/
├── apps/
│   ├── web/                    # Next.js web app (see apps/web/CLAUDE.md)
│   └── swift/                  # Native macOS keyboard (see apps/swift/CLAUDE.md)
├── packages/
│   ├── shared/                 # @september/shared - Utils, hooks, types
│   ├── ui/                     # @september/ui - shadcn/ui components
│   ├── account/                # @september/account - User account & DB sync
│   ├── ai/                     # @september/ai - AI config & service registry
│   ├── analytics/              # @september/analytics - Usage analytics
│   ├── audio/                  # @september/audio - Audio playback & storage
│   ├── chats/                  # @september/chats - Chat & message management
│   ├── cloning/                # @september/cloning - Voice cloning
│   ├── documents/              # @september/documents - Document management
│   ├── editor/                 # @september/editor - Autocomplete text editor
│   ├── keyboards/              # @september/keyboards - Accessible keyboards
│   ├── onboarding/             # @september/onboarding - User onboarding
│   ├── recording/              # @september/recording - Audio recording
│   ├── speech/                 # @september/speech - TTS & voice management
│   └── suggestions/            # @september/suggestions - Contextual suggestions
├── pnpm-workspace.yaml
└── package.json
```

## Development

```bash
pnpm install                      # Install all dependencies
pnpm --filter @september/web dev  # Start web app dev server
```

## Package Conventions

All shared code lives in `packages/` with `@september/*` naming and `workspace:*` dependencies.

**Package structure:**
- `components/` — Context providers, forms, feature UI
- `hooks/` — State management and domain logic
- `lib/` — Utility functions and services
- `types/` — Zod schemas and TypeScript interfaces
- `index.ts` — Public API
- `package.json` — Manifest with `workspace:*` deps
- `README.md` — Architectural decisions and usage

## Rules

- Do what has been asked; nothing more, nothing less
- ALWAYS prefer editing existing files over creating new ones
- **READ and UPDATE the README.md** in each module directory before and after making changes
- Follow the modular structure in `packages/` for new features or refactors
- For app-specific guidance, see the CLAUDE.md in each app directory
