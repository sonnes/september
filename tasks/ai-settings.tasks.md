# AI Settings Implementation Tasks

## Relevant Files

- `app/(app)/settings/ai/page.tsx` - Main AI settings page component
- `components/settings/ai-settings-form.tsx` - Form component for AI settings
- `components/settings/persona.tsx` - Persona input component with examples
- `components/settings/corpus.tsx` - Corpus input component
- `hooks/use-ai-settings.ts` - Hook for managing AI settings state and Supabase operations
- `services/embeddings.ts` - Service for generating embeddings using Transformers
- `types/ai-settings.ts` - TypeScript types for AI settings
- `supabase/migrations/[timestamp]_add_ai_settings_to_accounts.sql` - Database migration to add AI settings columns to accounts table

## Tasks

- [x] 1.0 Create AI Settings Page Structure
  - [x] 1.1 Create the main AI settings page route at `app/(app)/settings/ai/page.tsx`
  - [x] 1.2 Create the AI settings form component with proper layout and styling
  - [x] 1.3 Add navigation breadcrumbs to the AI settings page
  - [x] 1.4 Implement responsive design for mobile and desktop views

- [x] 2.0 Implement Persona Configuration
  - [x] 2.1 Create persona textarea component with character count
  - [x] 2.2 Add 2-3 example personas as as help text

- [ ] 3.0 Implement Corpus Management
  - [ ] 3.1 Create corpus textarea component with text area and character count
  - [ ] 3.2 Add generate corpus button. This should call the `generateCorpus` function in the `use-ai-settings` hook.
  - [ ] 3.3 Add a loading state to the generate corpus button.
  - [ ] 3.4 `generateCorpus` should call `/api/ai/generate-corpus` and update the corpus state with the response.

- [ ] 4.0 Add Embeddings Generation
  - [ ] 4.1 Create embeddings service using `lib/transformer/index.ts`
  - [ ] 4.2 Implement corpus processing and embedding generation
  - [ ] 4.3 Add progress indicators for embedding generation
  - [ ] 4.4 Store embeddings as a file in the `llm` bucket.

- [ ] 5.0 Create Settings Persistence Layer
  - [ ] 5.1 Create database migration to add AI settings columns to existing accounts table
  - [ ] 5.2 Update account types to include AI settings fields
  - [ ] 5.3 Create `use-ai-settings` hook that extends existing account functionality
  - [ ] 5.4 Implement save/load functionality for persona settings in account record
  - [ ] 5.5 Add error handling and loading states
  - [ ] 5.6 Implement settings synchronization with existing account context
