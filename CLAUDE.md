# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `bun run dev` - Start development server
- `bun run build` - Build production application
- `bun run start` - Start production server
- `bun run lint` - Run ESLint for code quality checks

### Database Operations

- Database migrations are in `supabase/migrations/`
- Local Triplit schema is in `triplit/schema.ts`
- Use Supabase CLI for database operations

## Architecture Overview

September is an assistive communication app built with Next.js 15 App Router, featuring a dual-database architecture and real-time AI-powered features.

### Core Architecture Patterns

**Dual Database Strategy:**

- **Supabase (Cloud)**: Authentication, persistent storage, file storage (audio), full-text search
- **Triplit (Local)**: Local-first data with no sync capabilities
- Data flows: Authenticated users → Supabase. Unauthenticated users → Triplit.

**Service Layer Pattern:**
All external integrations use service classes in `services/`:

- `MessagesService` - Message CRUD with full-text search
- `ElevenLabs` - Voice synthesis and cloning
- `Gemini` - AI text generation
- `Speech` providers - Text-to-speech with multiple providers

**Context + Hooks Architecture:**

- React Context providers in `components/context/` manage global state
- Custom hooks in `hooks/` encapsulate business logic and side effects
- Pattern: Provider wraps components → Custom hook accesses context → Service handles external calls

**Autocomplete System:**

- Custom implementation in `lib/autocomplete/` using Trie data structures
- Trains on user's message history + AI corpus
- Provides word completion, next-word prediction, and phrase suggestions
- Initialized in `useAutocomplete` hook, integrated via `TypingSuggestions` class

### Key Integration Points

**Authentication Flow:**

- Supabase Auth with middleware protection (`middleware.ts`)
- Routes protected: `/api/*`, `/talk`, `/stories/*`, `/account`
- Auth callbacks handled in `app/auth/`

**AI Features:**

- Gemini API integration for text generation (`services/gemini.ts`)
- User-specific AI corpus stored in accounts table
- AI settings managed in `/settings/ai`

**Audio Pipeline:**

- ElevenLabs for voice synthesis and cloning
- Audio files stored in Supabase storage buckets
- Voice Activity Detection (VAD) for speech input
- Multiple TTS providers via speech service abstraction

**Message System:**

- Messages stored in Supabase with full-text search capabilities
- Real-time updates via Supabase realtime
- Audio attachments linked to messages
- Search functionality with text preprocessing

### File Organization Patterns

**Component Structure:**

- Feature-based organization under `components/`
- Each feature has its own directory (e.g., `talk/`, `editor/`, `nav/`)
- Shared UI components in `components/ui/`

**Type Definitions:**

- All TypeScript types in `types/` directory
- Organized by domain: `message.ts`, `audio.ts`, `account.ts`, etc.

**API Routes:**

- RESTful structure under `app/api/`
- Feature-based grouping: `/ai/*`, `/speech/*`, `/transcribe/*`
- Authentication required for all API routes

### Development Notes

**Environment Setup:**

- Requires Supabase project with proper environment variables
- ElevenLabs API key for voice features
- Google Gemini API key for AI features

**Database Schema:**

- Messages table with full-text search enabled
- Accounts table with AI settings and speech preferences
- RLS policies implemented for user data isolation

**Styling:**

- Tailwind CSS 4 with custom configuration
- Noto Sans font family
- Toast notifications via Sonner

**State Management:**

- No global state management library
- React Context for shared state
- Local component state for UI interactions
- Service classes for external API state

**Form Patterns:**

- ALL forms must use `react-hook-form` with `zodResolver` for validation
- Use form components from `components/ui/form.tsx` (`FormInput`, `FormTextarea`, `FormCheckbox`, etc.)
- Follow the pattern from `app/(app)/settings/ai/form.tsx`
- Form validation schemas should be defined with Zod
- Error handling via toast notifications from `useToast` hook
- Use `SectionProps` interface for form sections
