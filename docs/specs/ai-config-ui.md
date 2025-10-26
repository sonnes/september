# AI Configuration UI Specification

## Overview

This specification defines the user interface components, forms, and user interactions for managing AI configuration in the September application.

---

## Design Principles

1. **Form Validation**: All forms use `react-hook-form` with `zodResolver`
2. **Error Handling**: Clear, user-friendly error messages via toast notifications
3. **Progressive Disclosure**: Show advanced settings only when needed
4. **Security**: Never display API keys in plain text (use password inputs)
5. **Accessibility**: Follow WCAG 2.1 AA guidelines
6. **Contextual Configuration**: Feature settings appear in context (on feature pages via modals)

---

## Architecture: Ideal State

### Summary

**The ideal state separates provider configuration from feature configuration:**

1. **`/settings/ai`** = Single page for ALL provider API keys (Gemini, ElevenLabs)
2. **Feature Modals** = Each feature has its own modal for configuration:
   - `/components/ai/settings/suggestions-form.tsx` → AI Suggestions form (model, instructions, corpus, settings)
   - `/components/ai/settings/speech-form.tsx` → Speech Settings form (TTS)
   - `/components/ai/settings/transcription-form.tsx` → Transcription Settings form (transcription)

**Key Benefits:**

- Simpler `/settings/ai` page (just API keys, not overwhelming)
- Contextual configuration (adjust AI while writing, adjust speech while talking)
- Better UX (settings where you use them)
- Clear separation of concerns (providers vs features)

### Principle: Separation of Concerns

**Provider Configuration** (Global) → `/settings/ai`

- API keys for all providers (Gemini, ElevenLabs)
- Custom base URLs (advanced)
- One-time setup, rarely changed

**Feature Configuration** (Contextual) → Modal on feature pages

- Model selection per feature
- Feature-specific settings
- Configured where the feature is used

### Page Structure

```
/settings/ai
└── Provider Configuration ONLY
    ├── Gemini API Key + Base URL
    └── ElevenLabs API Key + Base URL

/components/ai/settings/suggestions-form.tsx
└── Suggestions Form
    ├── AI Suggestions Toggle
    ├── Model Selection (gemini-2.5-flash-lite, flash, pro)
    ├── System Instructions
    ├── AI Corpus + Generate Button
    └── Advanced Settings (temperature, max_suggestions, context_window)

/components/ai/settings/speech-form.tsx
└── Speech Form
    ├── Provider Selection (Browser/ElevenLabs)
    ├── Voice Selection
    └── Provider-Specific Settings (speed, pitch, volume, stability, etc.)

/components/ai/settings/transcription-form.tsx
└── Transcription Form
    ├── Model Selection (gemini-2.5-flash-lite, flash, pro)
    └── toggle to enable/disable transcription
```

### Migration Path

**Phase 1: Create Provider-Only Settings Page**

- Move `/settings/ai` to show only provider configuration
- Remove feature configurations from this page
- Keep existing dialogs functional during transition

**Phase 2: Implement Feature Forms**

- Create `SuggestionsForm` on `/components/ai/settings/suggestions-form.tsx` for suggestions config
- Create `SpeechForm` on `/components/ai/settings/speech-form.tsx` for TTS config
- Create `TranscriptionForm` on `/components/ai/settings/transcription-form.tsx` for transcription config
- Preserve all existing functionality in new locations

---

## Error States

### Invalid API Key

```typescript
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Invalid API Key</AlertTitle>
  <AlertDescription>
    The API key you entered is invalid. Please check:
    <ul className="list-disc list-inside mt-2">
      <li>The key is copied correctly (no extra spaces)</li>
      <li>The key hasn't expired</li>
      <li>You have sufficient credits/quota</li>
    </ul>
  </AlertDescription>
</Alert>
```

### Feature Unavailable

```typescript
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Feature Unavailable</AlertTitle>
  <AlertDescription>
    This feature requires authentication. Please sign in to use AI-powered features.
  </AlertDescription>
</Alert>
```

### Rate Limit Exceeded

```typescript
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Rate Limit Exceeded</AlertTitle>
  <AlertDescription>
    You've reached the maximum number of requests for this feature.
    Please try again in {remainingTime}.
  </AlertDescription>
</Alert>
```

---

## Accessibility Considerations

1. **Keyboard Navigation**: All forms fully navigable via keyboard
2. **Screen Readers**: Proper ARIA labels and descriptions
3. **Focus Management**: Logical tab order, visible focus indicators
4. **Error Announcements**: Errors announced to screen readers
5. **Color Contrast**: Meet WCAG AA standards (4.5:1 for text)

---

## Responsive Design

### Mobile Layout

```
- Stack form fields vertically
- Full-width inputs
- Larger touch targets (min 44x44px)
- Collapsible sections for advanced settings
- Sticky save button at bottom
```

### Tablet Layout

```
- Two-column layout for form fields
- Sidebar navigation for settings sections
- Expanded advanced settings by default
```

### Desktop Layout

```
- Three-column layout
- Left: Navigation
- Center: Form fields
- Right: Help/documentation panel
```

---

## Implementation Plan: Achieving Ideal State

### Phase 1: Create Provider-Only Settings Page

**Goal:** Simplify `/settings/ai` to only handle provider API keys

**Tasks:**

1. **Create new `/settings/ai/page.tsx`**
   - Implement provider configuration form (Gemini + ElevenLabs)
   - API key inputs (password type)
   - Custom base URL inputs (collapsible advanced section)
   - Single save button for all providers
   - Links to API key generation pages

2. **Update navigation**
   - Ensure `/settings/ai` route works correctly
   - Remove any feature-related content from settings nav

3. **Test provider configuration**
   - Verify API key validation (client + server side)
   - Test saving multiple provider keys
   - Ensure error handling works

**Success Criteria:**

- `/settings/ai` shows only provider API key configuration
- No feature toggles or model selection on this page
- Existing dialogs continue to work (no breaking changes yet)

---

### Phase 2: Implement Feature Forms

**Goal:** Create contextual configuration forms

**Tasks:**

1. **Create Suggestions Form**
   - File: `components/ai/settings/suggestions-form.tsx`
   - Implement suggestions configuration form
   - Include model selection dropdown
   - Add system instructions textarea with examples
   - Add AI corpus section with "Generate" button
   - Advanced settings (temperature, max_suggestions, context_window)
   - API key check with link to `/settings/ai` if missing

2. **Create Speech Form**
   - File: `components/ai/settings/speech-form.tsx`
   - Implement TTS configuration form
   - Include provider selection dropdown
   - Add voice selection dropdown
   - Add advanced settings (speed, pitch, volume, stability, etc.)
   - API key check with link to `/settings/ai` if missing

3. **Create Transcription Form**
   - File: `components/ai/settings/transcription-form.tsx`
   - Implement transcription configuration form
   - Include model selection dropdown
   - Add toggle to enable/disable transcription
   - API key check with link to `/settings/ai` if missing

---

### Dependencies

**Required Components:**

- `components/ui/dialog.tsx` - For modals
- `components/ui/form.tsx` - Form components (FormInput, FormTextarea, etc.)
- `components/ui/button.tsx` - Buttons
- `components/ui/tabs.tsx` - Tabs for speech modal
- `components/ui/alert.tsx` - Warning/error alerts
- `components/voices/voices-list.tsx` - Voice selection component

**Required Hooks:**

- `use-account` - Account data and update function
- `use-toast` - Toast notifications
- `use-ai-features` - Check provider configuration
- `use-speech` - Get voices by provider

**Required Types:**

- `types/ai-config.ts` - AI configuration types
- Updates to `types/account.ts` - New account schema fields

## Related Documents

- [Storage Specification](./ai-config-storage.md)
- [Services Specification](./ai-config-services.md)
- [Overview](./ai-config-overview.md)
