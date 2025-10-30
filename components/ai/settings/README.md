# AI Feature Settings Forms

This directory contains feature-specific configuration forms for AI capabilities in September. Each form can be used standalone on a settings page or as a dialog/modal for contextual configuration.

## Overview

According to the [AI Configuration UI Specification](../../../docs/specs/ai-config-ui.md), feature settings are separated from provider configuration:

- **Provider Configuration** (API keys) → `/settings/ai` page
- **Feature Configuration** (model selection, settings) → Contextual modals on feature pages

## Forms

### SuggestionsForm

Configure AI-powered typing suggestions.

**Features:**

- Enable/disable toggle
- Model selection (Gemini 2.5 Flash Lite, Flash, Pro)
- System instructions with examples
- Advanced settings (temperature, max suggestions, context window)
- API key check with link to provider settings

**Usage:**

```tsx
import { SuggestionsForm } from '@/components/ai/settings';

// As a standalone form (e.g., in a settings page)
<SuggestionsForm />

// As a dialog/modal (e.g., in editor toolbar)
<SuggestionsForm asDialog />

// With custom callbacks
<SuggestionsForm
  asDialog
  onSave={(data) => console.log('Saved:', data)}
  onClose={() => console.log('Closed')}
/>
```

### SpeechForm

Configure text-to-speech settings.

**Features:**

- Enable/disable toggle
- Provider selection (Browser TTS, ElevenLabs)
- Voice selection with preview
- Provider-specific settings:
  - Browser: speed, pitch, volume
  - ElevenLabs: stability, similarity boost
- API key check for ElevenLabs

**Usage:**

```tsx
import { SpeechForm } from '@/components/ai/settings';

// As a standalone form
<SpeechForm />

// As a dialog/modal
<SpeechForm asDialog />
```

### TranscriptionForm

Configure speech-to-text transcription.

**Features:**

- Enable/disable toggle
- Model selection (Gemini 2.5 Flash Lite, Flash, Pro)
- Advanced settings:
  - Auto-detect language
  - Include timestamps
  - Filter profanity
- API key check with link to provider settings

**Usage:**

```tsx
import { TranscriptionForm } from '@/components/ai/settings';

// As a standalone form
<TranscriptionForm />

// As a dialog/modal
<TranscriptionForm asDialog />
```

## Component Props

All forms share the same interface:

```typescript
interface FormProps {
  /** If true, opens the form in a dialog/modal */
  asDialog?: boolean;

  /** Callback when form is saved */
  onSave?: (data: FormData) => void;

  /** Callback when dialog is closed */
  onClose?: () => void;
}
```

## Types

Each form exports its own types and Zod schemas:

```typescript
// Import from specific form files
import type { SuggestionsFormData } from '@/components/ai/settings';
import type { SpeechFormData } from '@/components/ai/settings';
import type { TranscriptionFormData } from '@/components/ai/settings';

// Or import all together from the index
import type {
  SpeechFormData,
  SuggestionsFormData,
  TranscriptionFormData,
} from '@/components/ai/settings';
```

All form data types are validated with Zod schemas:

```typescript
import {
  SpeechFormSchema,
  SuggestionsFormSchema,
  TranscriptionFormSchema,
} from '@/components/ai/settings';
```

## Form Behavior

### Standalone Mode (`asDialog={false}`)

- Renders form directly in the page
- Saves to account settings via `updateAccount`
- Shows success toast on save
- No dialog wrapper

### Dialog Mode (`asDialog={true}`)

- Renders a trigger button with icon
- Opens form in a full-screen modal (mobile) or centered dialog (desktop)
- Includes header, scrollable content, and fixed footer
- Closes dialog on successful save or cancel

## Validation

All forms use:

- `react-hook-form` for form state management
- `zod` for schema validation via `zodResolver`
- Form components from `@/components/ui/form`

## State Management

Forms integrate with:

- `useAccount` hook for account data and updates
- `useToast` for success/error notifications
- `useSpeech` (SpeechForm only) for voice listing

## API Key Checks

Forms that require API keys display warnings when keys are missing:

- **SuggestionsForm** → Requires Gemini API key
- **SpeechForm** → Requires ElevenLabs API key (for ElevenLabs provider)
- **TranscriptionForm** → Requires Gemini API key

Warnings include a link to `/settings/ai` for provider configuration.

## UI Patterns

### Layout Structure

All forms follow a consistent three-column grid layout:

```
┌─────────────────────────────────────────────────────┐
│  Section Title (1/3)  │  Form Controls (2/3)        │
│  Description          │                             │
└─────────────────────────────────────────────────────┘
```

### Collapsible Sections

- Example instructions (SuggestionsForm)
- Advanced settings (all forms)

Collapsible sections use consistent chevron icons and transitions.

### Provider-Specific Settings

Forms conditionally render settings based on selected provider:

- SpeechForm: Browser TTS settings vs ElevenLabs settings
- Controlled by `watch('provider')` from react-hook-form

## Accessibility

All forms follow WCAG 2.1 AA guidelines:

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Focus management in dialogs
- Screen reader announcements for errors
- Color contrast requirements met

## Integration

These forms are designed to be integrated into:

1. **Feature pages** - Add dialog trigger buttons to editor toolbar, talk page, etc.
2. **Settings pages** - Render forms directly for comprehensive settings management
3. **Onboarding flows** - Guide users through feature configuration

## Related Files

- [suggestions-form.tsx](./suggestions-form.tsx) - AI Suggestions form with types
- [speech-form.tsx](./speech-form.tsx) - Text-to-Speech form with types
- [transcription-form.tsx](./transcription-form.tsx) - Speech-to-Text form with types
- [AI Config Spec](../../../docs/specs/ai-config-ui.md) - Full UI specification
- [AI Config Storage](../../../docs/specs/ai-config-storage.md) - Storage layer spec
- [AI Config Services](../../../docs/specs/ai-config-services.md) - Service layer spec
