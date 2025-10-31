# Onboarding Page Specification

## Overview

A multi-step wizard that guides new users through setting up September. Collects API keys, voice preferences, and AI suggestion settings before redirecting to `/talk`.

## User Flow

```
Welcome → API Keys → Speech → Suggestions → Complete → /talk
```

## Architecture

### Route: `/onboarding`

**Components:**
- [page.tsx](../app/onboarding/page.tsx) - Server component with layout
- [onboarding-client.tsx](../app/onboarding/onboarding-client.tsx) - Client wrapper, handles completion
- [onboarding-wizard.tsx](../app/onboarding/onboarding-wizard.tsx) - Main wizard with step rendering and progress indicator
- [context.tsx](../app/onboarding/context.tsx) - State management via OnboardingProvider

**Steps:**
- [steps/welcome.tsx](../app/onboarding/steps/welcome.tsx) - Provider overview
- [steps/complete.tsx](../app/onboarding/steps/complete.tsx) - Success screen

### State Management

**OnboardingProvider** ([context.tsx](../app/onboarding/context.tsx)):
- `currentStep`: Current wizard step
- `completedSteps`: Set of completed steps
- `formData`: Collected form data (apiKeys, speech, suggestions)
- **Data Loading**: Automatically loads existing account settings to pre-populate forms
  - API keys from `account.ai_providers`
  - Speech settings from `account.ai_speech`
  - Suggestions settings from `account.ai_suggestions`
- Navigation: `goNext()`, `goBack()`, `goSkip()`
- Updates: `updateApiKeys()`, `updateSpeech()`, `updateSuggestions()`

**Form Data Types** (defined in [onboarding-wizard.tsx](../app/onboarding/onboarding-wizard.tsx)):
- `ApiKeysFormData`: API keys for all providers
- `SpeechFormData`: TTS provider and voice settings
- `SuggestionsFormData`: AI suggestions configuration

## Steps

### Welcome ([steps/welcome.tsx](../app/onboarding/steps/welcome.tsx))

**Purpose:** Introduce AI providers and their capabilities

**UI:**
- Provider cards grid (responsive: 3 cols desktop, 2 tablet, 1 mobile)
- Each card shows: icon, features, API key link (if needed), status
- Providers: Google Gemini, ElevenLabs, Browser Speech
- Actions: "Continue to Setup" button, "I'll set this up later" link

---

### API Keys ([steps/api-keys.tsx](../app/onboarding/steps/api-keys.tsx))

**Purpose:** Collect API keys for AI providers

**UI:**
- Heading: "Connect Your AI Providers"
- Dynamic form fields for each provider from AI registry
- Each provider section includes:
  - Provider name, description, and feature pills
  - "Get API Key" link to provider's API key page
  - API key input field (password type)
  - Optional custom base URL field
- Security note about API key storage
- Actions: Back, Skip for now, Continue

**Implementation:**
- Uses reusable `APIKeysForm` component from [components/settings/api-keys-form.tsx](../components/settings/api-keys-form.tsx)
- Form uses `react-hook-form` with `zodResolver` for validation
- Dynamically generates schema from AI provider registry
- All fields are optional (allows skipping)
- Updates onboarding context with `updateApiKeys()`
- Navigates to next step on submit
- Shared with settings page for consistency

---

### Speech Setup (TODO)

**Purpose:** Select TTS provider and voice

**UI:**
- Heading: "Set Up Your Voice"
- Provider selector (browser, gemini, elevenlabs)
- Voice grid with preview buttons
- Actions: Back, Skip, Continue

**Notes:**
- Currently placeholder in [onboarding-wizard.tsx](../app/onboarding/onboarding-wizard.tsx):269
- Should reuse components from AI settings forms
- Default to browser TTS if no API keys

---

### Suggestions (TODO)

**Purpose:** Configure AI suggestions settings

**UI:**
- Heading: "Personalize Your AI Assistant"
- System instructions textarea
- Enable/disable toggle
- Actions: Back, Skip, Complete Setup

**Notes:**
- Currently placeholder in [onboarding-wizard.tsx](../app/onboarding/onboarding-wizard.tsx):292
- Should reuse components from AI settings forms
- Smart defaults for advanced settings

---

### Complete ([steps/complete.tsx](../app/onboarding/steps/complete.tsx))

**Purpose:** Show success and next steps

**UI:**
- Success icon with animation
- Configuration summary
- Next steps cards (Start Talking, Browse Voices, Customize Settings)
- Actions: "Start Talking" button (calls onComplete), "Customize Settings" link

**Behavior:**
- onComplete in [onboarding-client.tsx](../app/onboarding/onboarding-client.tsx):21 saves all form data to account
- Sets `account.onboarding_completed = true`
- Redirects to `/talk`

---

## Progress Indicator

Located in [onboarding-wizard.tsx](../app/onboarding/onboarding-wizard.tsx):113-222

**Features:**
- Shows steps: API Keys (1), Speech & Voice (2), Suggestions (3)
- Visual states: completed (green checkmark), current (indigo), upcoming (gray)
- Progress bar animates based on current step
- Responsive: full labels on desktop, compact on mobile
- Hidden for 'welcome' and 'complete' steps

---

## Completion Flow

1. User completes all steps
2. Clicks "Start Talking" on complete screen
3. `handleComplete` in [onboarding-client.tsx](../app/onboarding/onboarding-client.tsx):21 runs
4. Updates account with:
   - `onboarding_completed: true`
   - `ai_providers: formData.apiKeys`
   - `ai_speech: formData.speech`
   - `ai_suggestions: formData.suggestions`
5. Redirects to `/talk`

---

## TODO: Next Implementation Steps

1. ~~**API Keys Step**~~ ✅ COMPLETED
   - ~~Create `steps/api-keys.tsx`~~
   - ~~Import form fields from settings forms~~
   - ~~Add to wizard step rendering~~
   - ~~Wire up `updateApiKeys()` from context~~

2. **Speech Step**
   - Create `steps/speech.tsx`
   - Import speech form components
   - Add voice selector/preview
   - Wire up `updateSpeech()` from context

3. **Suggestions Step**
   - Create `steps/suggestions.tsx`
   - Import suggestions form components
   - Simplify for onboarding (hide advanced settings)
   - Wire up `updateSuggestions()` from context

4. **Form Validation**
   - Add validation before allowing navigation
   - Handle skip scenarios
   - Show appropriate error messages

5. **Testing**
   - Test full flow end-to-end
   - Test skip functionality
   - Test back navigation
   - Test form data persistence
   - Test responsive design
