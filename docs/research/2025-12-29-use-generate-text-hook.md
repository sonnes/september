# Research: useGenerateText Hook Implementation

**Date:** 2025-12-29  
**Feature:** Create a reusable hook in `packages/ai` for text generation with provider settings integration  
**Scope:** Medium - New hook creation with existing pattern reuse

---

## 1. Executive Summary

### Objective
Create a new hook `useGenerateText` in the `packages/ai` module that:
1. Provides a `generateText` function for AI text generation
2. Reads provider settings from the account package
3. Initializes the appropriate AI provider (currently Gemini) based on those settings
4. Follows existing patterns in the codebase for consistency

### Scope of Impact
- **Low-Medium Impact**: This is a new hook addition to an existing package
- No breaking changes to existing functionality
- Follows established patterns from `use-corpus.ts` and `use-generate-keyboard.ts`
- Will be consumed by other packages that need text generation capabilities

### Key Findings
1. **Pattern Exists**: Three similar hooks already exist that follow the exact pattern we need:
   - `/packages/suggestions/hooks/use-corpus.ts` - Uses `generateText` from Vercel AI SDK
   - `/packages/keyboards/hooks/use-generate-keyboard.ts` - Uses `generateObject` from Vercel AI SDK
   - `/packages/suggestions/hooks/use-suggestions.ts` - Uses `generateObject` from Vercel AI SDK

2. **Provider Access**: The `useAISettings` hook from `packages/ai` provides the `getProviderConfig` function to access API keys

3. **AI SDK**: Project uses Vercel AI SDK (`ai` package v6.0.3) with `@ai-sdk/google` v3.0.1

4. **No Tests Required**: No test files exist in the codebase for hooks (verified by searching packages)

---

## 2. What Exists

### Current AI Package Structure

```
packages/ai/
├── README.md                        # Module documentation
├── index.ts                         # Public exports
├── components/
│   ├── context.tsx                 # AISettingsProvider context
│   ├── ai-providers-form.tsx       # API key configuration UI
│   ├── provider-section.tsx        # Provider UI component
│   └── transcription-form.tsx      # Transcription settings UI
├── hooks/
│   └── use-ai-settings.ts          # Hook to access AI settings context
├── lib/
│   ├── defaults.ts                 # Default configurations
│   └── registry.ts                 # Provider registry and metadata
└── types/
    └── schemas.ts                  # Zod schemas for validation
```

### Existing Hooks in packages/ai

**Only one hook exists:**
- `/packages/ai/hooks/use-ai-settings.ts` (14 lines)
  - Simple context consumer hook
  - Returns `AISettingsContext` which provides:
    - `suggestionsConfig`, `transcriptionConfig`, `speechConfig`
    - Update functions for each config
    - `getProviderConfig(provider: AIProvider)` - Returns `ProviderConfig | undefined`

### Provider Registry (`packages/ai/lib/registry.ts`)

Defines metadata for all supported AI providers:

```typescript
export const AI_PROVIDERS: Record<AIProvider, AIServiceProvider> = {
  browser: { /* ... */ },
  webllm: { /* ... */ },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    features: ['ai', 'transcription', 'speech'],  // Recently changed from 'suggestions'
    requires_api_key: true,
    api_key_url: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', /* ... */ },
      { id: 'gemini-2.5-flash-preview-tts', /* ... */ },
      { id: 'gemini-2.5-pro-preview-tts', /* ... */ },
    ],
  },
  elevenlabs: { /* ... */ },
};
```

**Recent Changes:** Git diff shows:
- Added `'webllm'` provider
- Changed `'suggestions'` feature to `'ai'` in AIFeature type
- Updated provider features from `'suggestions'` to `'ai'`

### AI Settings Context (`packages/ai/components/context.tsx`)

**Key functionality:**

```typescript
export interface AISettingsContextType {
  // AI Feature Configurations
  suggestionsConfig: SuggestionsConfig;
  transcriptionConfig: TranscriptionConfig;
  speechConfig: SpeechConfig;

  // Update functions
  updateSuggestionsConfig: (config: Partial<SuggestionsConfig>) => Promise<void>;
  updateTranscriptionConfig: (config: Partial<TranscriptionConfig>) => Promise<void>;
  updateSpeechConfig: (config: Partial<SpeechConfig>) => Promise<void>;

  // Provider Configurations
  getProviderConfig: (provider: AIProvider) => ProviderConfig | undefined;
}
```

**Provider config access pattern:**
```typescript
const getProviderConfig = useCallback(
  (provider: AIProvider): ProviderConfig | undefined => {
    if (provider === 'browser') return undefined;
    return account?.ai_providers?.[provider];
  },
  [account]
);
```

Returns:
```typescript
interface ProviderConfig {
  api_key?: string;
  base_url?: string;
}
```

---

## 3. How Components Connect

### Data Flow: Account → AI Settings → Hooks

```
┌─────────────────────────────────────────┐
│   packages/account/context.tsx          │
│   AccountProvider                       │
│   - Wraps useDbAccount (TanStack DB)   │
│   - Provides: account, updateAccount    │
│   - account.ai_providers.gemini         │
│     { api_key, base_url }               │
└──────────────┬──────────────────────────┘
               │
               │ useAccountContext()
               ↓
┌─────────────────────────────────────────┐
│   packages/ai/components/context.tsx    │
│   AISettingsProvider                    │
│   - Reads from useAccountContext()      │
│   - Provides: getProviderConfig()       │
│   - Maps account.ai_providers to config │
└──────────────┬──────────────────────────┘
               │
               │ useAISettings()
               ↓
┌─────────────────────────────────────────┐
│   Consumer Hooks (use-corpus.ts, etc)  │
│   - Call getProviderConfig('gemini')    │
│   - Get { api_key, base_url }           │
│   - Initialize provider with API key    │
│   - Call Vercel AI SDK functions        │
└─────────────────────────────────────────┘
```

### Example Connection Pattern (from use-corpus.ts)

```typescript
// 1. Import the AI settings hook
import { useAISettings } from '@/packages/ai';

// 2. Get provider config in the component
const { getProviderConfig } = useAISettings();
const providerConfig = getProviderConfig('gemini');
const apiKey = providerConfig?.api_key;

// 3. Memoize the provider initialization
const google = useMemo(
  () => createGoogleGenerativeAI({ apiKey: apiKey || '' }),
  [apiKey]
);

// 4. Use in async function
const { text } = await generateText({
  model: google('gemini-2.5-flash'),
  system: PROMPT,
  prompt: userInput,
});
```

---

## 4. What Will Be Affected

### Files to Create/Modify

**New File:**
1. `/packages/ai/hooks/use-generate-text.ts` (new hook)

**Modified Files:**
2. `/packages/ai/index.ts` - Add export for new hook
3. `/packages/ai/README.md` - Document new hook usage

### No Breaking Changes
- All changes are additive
- No modifications to existing hook interfaces
- No changes to context providers
- No database schema changes

### Dependent Components
The new hook will be consumed by:
- Any package needing generic text generation
- Future features requiring AI text generation beyond suggestions/corpus

---

## 5. Existing Validation

### Testing Infrastructure
**No test files exist** in the codebase for packages:
- Searched for `*.test.ts` and `*.test.tsx` in `/packages` - found none
- Package.json includes vitest configuration but no package-level tests found
- Validation appears to be manual/integration testing

### Code Quality Checks
From `package.json`:
```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "vitest --run",
    "test:watch": "vitest"
  }
}
```

### Validation Strategy
- **TypeScript**: Type checking via `typescript@^5`
- **Linting**: ESLint with Next.js config
- **Runtime**: Error handling with try-catch, console.error, and toast notifications

---

## 6. Context for Planning

### Pattern to Follow: use-corpus.ts

The **cleanest, most recent example** is `/packages/suggestions/hooks/use-corpus.ts`:

```typescript
'use client';

import { useMemo, useState } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { toast } from 'sonner';
import { useAISettings } from '@/packages/ai';

const PROMPT = `...`;

export function useCorpus() {
  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const providerConfig = getProviderConfig('gemini');
  const apiKey = providerConfig?.api_key;

  const google = useMemo(
    () => createGoogleGenerativeAI({ apiKey: apiKey || '' }),
    [apiKey]
  );

  const generateCorpus = async (persona: string) => {
    if (!apiKey) {
      toast.error('API key is required to generate corpus.');
      return;
    }

    setIsGenerating(true);

    try {
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        system: PROMPT,
        prompt: `PERSONA: ${persona}\n\nCORPUS:`,
      });

      if (!text) {
        toast.error('Failed to generate corpus. Please try again.');
        return;
      }

      return text;
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate corpus. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generateCorpus };
}
```

### Key Patterns Identified

**1. Provider Initialization Pattern:**
```typescript
const { getProviderConfig } = useAISettings();
const providerConfig = getProviderConfig('gemini');
const apiKey = providerConfig?.api_key;

const google = useMemo(
  () => createGoogleGenerativeAI({ apiKey: apiKey || '' }),
  [apiKey]
);
```

**2. Error Handling Pattern:**
- Mutation hooks (write operations) throw errors
- Use toast notifications for user feedback
- Console.error for debugging
- Return undefined on error or use try-catch

**3. Loading State Pattern:**
```typescript
const [isLoading, setIsLoading] = useState(false);
// Use in async operations
```

**4. Return Type Pattern (from CLAUDE.md):**
```typescript
interface UseOperationReturn {
  data: T | undefined;
  isLoading: boolean;
  error?: { message: string };
}
```

### Vercel AI SDK Usage

**Package versions:**
- `ai`: ^6.0.3 (main SDK)
- `@ai-sdk/google`: ^3.0.1 (Google provider)
- `@ai-sdk/elevenlabs`: ^1.0.20 (ElevenLabs provider)
- `@ai-sdk/react`: ^3.0.3 (React hooks)

**Available functions from `ai` package:**
- `generateText` - Used in `use-corpus.ts`
- `generateObject` - Used in `use-suggestions.ts` and `use-generate-keyboard.ts`
- `streamText` - Not currently used but available

### Alternative: Legacy Service Pattern

There's an older service class pattern in `/services/gemini.ts`:
- Uses `@google/genai` package (Google's native SDK)
- Class-based service with multiple methods
- **NOT RECOMMENDED** - Older pattern, not used in newer hooks

---

## 7. Recommended Approach

### Hook Design

**Location:** `/packages/ai/hooks/use-generate-text.ts`

**Interface:**
```typescript
interface UseGenerateTextParams {
  provider?: AIProvider;  // Default to 'gemini'
  model?: string;         // Default to 'gemini-2.5-flash-lite'
}

interface UseGenerateTextReturn {
  generateText: (params: {
    prompt: string;
    system?: string;
    temperature?: number;
  }) => Promise<string | undefined>;
  isGenerating: boolean;
  error?: { message: string };
}

export function useGenerateText(params?: UseGenerateTextParams): UseGenerateTextReturn;
```

### Implementation Strategy

**Step 1: Create hook following use-corpus pattern**
- Use `useAISettings()` to get provider config
- Memoize provider initialization with `useMemo`
- Manage loading state with `useState`
- Handle errors with try-catch and toast

**Step 2: Make it flexible**
- Accept provider parameter (default 'gemini')
- Accept model parameter (default from registry)
- Support custom system prompts and temperature

**Step 3: Export and document**
- Add export to `/packages/ai/index.ts`
- Update `/packages/ai/README.md` with usage example

### Code Reuse Opportunities

**From use-corpus.ts:**
- Provider initialization pattern (lines 23-35)
- Error handling pattern (lines 38-65)
- Loading state management (line 24, 44, 64)

**From use-generate-keyboard.ts:**
- Error state management (line 59)
- Return type interface pattern (lines 51-55)

**From use-ai-settings.ts:**
- Context consumer pattern (lines 7-13)

### Configuration Flexibility

The hook should support:
1. **Provider override**: Allow passing different provider (future: elevenlabs, webllm)
2. **Model selection**: Use model from params or default from registry
3. **Generation options**: temperature, system prompt, etc.

This ensures the hook is reusable across different AI generation scenarios.

---

## 8. Open Questions

### 1. Should the hook support multiple providers?
**Current state:** All existing hooks hardcode `'gemini'` as the provider.

**Options:**
- **A.** Match existing pattern - hardcode `'gemini'` (simpler, consistent)
- **B.** Accept provider parameter for future flexibility (more flexible)

**Recommendation:** Start with option B (accept provider param) but default to 'gemini'. This matches the recent addition of 'webllm' to the registry and the change from 'suggestions' to 'ai' feature.

### 2. Should it expose raw Vercel AI SDK or wrap it?
**Options:**
- **A.** Thin wrapper - expose `generateText` function with pre-configured provider
- **B.** High-level API - hide Vercel AI SDK completely, expose simple interface

**Recommendation:** Option A (thin wrapper). Matches the pattern in use-corpus and use-generate-keyboard where the hook primarily handles provider initialization and error handling, but exposes the underlying SDK capabilities.

### 3. Error handling: throw or return error object?
**Current patterns:**
- `use-corpus.ts`: Returns undefined on error, shows toast
- `use-generate-keyboard.ts`: Throws error, sets error state, shows toast (in consumer)
- CLAUDE.md guidance: "Mutation hooks (write operations): Throw errors"

**Recommendation:** Follow use-corpus pattern - return undefined on error, show toast, log to console. This is a read-like operation (generating text) even though it calls an API.

### 4. Should we add TypeScript return type interface?
**From CLAUDE.md:**
> Return Types: All hooks should have explicit return type interfaces for better IDE support and type safety.

**Recommendation:** Yes, define explicit `UseGenerateTextReturn` interface matching the pattern in use-generate-keyboard.ts.

---

## 9. Dependencies and Integration Points

### Package Dependencies
Already installed, no new dependencies needed:
- `ai` (Vercel AI SDK)
- `@ai-sdk/google`
- `sonner` (for toast notifications)
- React hooks (useState, useMemo, useCallback)

### Integration Points
1. **Account Package**: Reads `account.ai_providers[provider].api_key` via `useAccountContext`
2. **AI Settings**: Uses `useAISettings()` from `packages/ai/components/context.tsx`
3. **Provider Registry**: Uses provider metadata from `packages/ai/lib/registry.ts`

### No Breaking Changes Required
- Context providers already support this functionality
- Provider config already includes API keys
- No database migrations needed

---

## 10. Implementation Checklist

- [ ] Create `/packages/ai/hooks/use-generate-text.ts`
  - [ ] Import dependencies (ai, @ai-sdk/google, react, sonner)
  - [ ] Define TypeScript interfaces
  - [ ] Implement hook following use-corpus pattern
  - [ ] Add error handling with toast notifications
  - [ ] Add loading state management
  - [ ] Memoize provider initialization

- [ ] Update `/packages/ai/index.ts`
  - [ ] Add `export * from '@/packages/ai/hooks/use-generate-text';`

- [ ] Update `/packages/ai/README.md`
  - [ ] Add hook to features list
  - [ ] Add usage example
  - [ ] Document parameters and return type

- [ ] Manual testing
  - [ ] Test with valid API key
  - [ ] Test with missing API key (should show error toast)
  - [ ] Test error handling (invalid prompt, network error)
  - [ ] Test loading states
  - [ ] Test with different models

---

## 11. Risk Assessment

### Low Risk
- Following established patterns exactly
- No breaking changes to existing code
- Additive change only (new hook)
- Dependencies already in place

### Potential Issues
1. **API Key Missing**: Handled by error check and toast notification
2. **Network Errors**: Handled by try-catch and error state
3. **Invalid Model**: Would fail at runtime, should validate against registry

### Mitigation
- Follow existing error handling patterns
- Add clear error messages
- Document requirements in README
- Test thoroughly with different scenarios

---

## Appendix: File Locations

### Key Files Referenced
- `/packages/ai/hooks/use-ai-settings.ts` - Context consumer hook
- `/packages/ai/components/context.tsx` - AISettingsProvider
- `/packages/ai/lib/registry.ts` - Provider registry
- `/packages/ai/lib/defaults.ts` - Default configurations
- `/packages/ai/README.md` - Module documentation
- `/packages/suggestions/hooks/use-corpus.ts` - Best pattern example
- `/packages/keyboards/hooks/use-generate-keyboard.ts` - Alternative pattern
- `/packages/account/context.tsx` - Account data provider
- `/packages/account/types/index.ts` - Account schema with ai_providers
- `/types/ai-config.ts` - Global AI type definitions
- `/CLAUDE.md` - Project coding standards and patterns

### Related Documentation
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Google AI SDK: https://ai.google.dev/gemini-api/docs
- TanStack DB (for account storage): https://tanstack.com/db
