# Onboarding Page Specification

## Overview

The onboarding page is the first page new users see after signing up for September. It guides them through essential initial setup steps to start using the application effectively. The page features a multi-step wizard interface that progressively collects configuration data while providing visual feedback on progress.

## Goals

1. **First Impression**: Welcome users and set expectations for the app's capabilities
2. **Essential Setup**: Guide users through minimum required configuration (API keys, voice, suggestions)
3. **Progressive Disclosure**: Break complex configuration into digestible steps
4. **User Confidence**: Show clear progress and allow users to understand what they're configuring
5. **Seamless Entry**: Enable users to start using the app quickly after completion

## User Flow

```
Sign Up → Onboarding Welcome → Step 1: API Keys → Step 2: Speech Setup → Step 3: Suggestions → Complete → Redirect to /talk
```

## Page Structure

### Route

- Path: `/onboarding`
- Access: When `account.onboarding_completed === false`, show the onboarding page.
- Redirect logic:
  - If `account.onboarding_completed === true`, redirect to `/talk`

### Layout

- Use standard app layout with header (no navigation during onboarding)
- Full-width container with centered content (max-width: 768px)
- Responsive design optimized for desktop and mobile devices

## Step-by-Step Breakdown

### Initial Welcome Screen

**Purpose**: Orient the user, explain what they'll accomplish, and introduce AI providers with their capabilities

**Content**:

- **Heading**: "Welcome to September"
- **Subheading**: "Let's get you set up in just a few minutes"
- **Brief Description**:
  - "September helps you communicate effectively with AI-powered assistance"
  - "We'll guide you through setting up AI providers to unlock powerful features"

---

#### AI Provider Overview Section

**Heading**: "Choose Your AI Providers"
**Description**: "September works with leading AI providers to give you the best experience. Get your API keys to unlock these features:"

**Provider Cards** (displayed in a grid layout):

##### 1. Google Gemini Card

```
[Gemini Logo/Icon]

Google Gemini
─────────────────
✨ AI Suggestions
   Smart typing completions
   Context-aware responses

🎙️ Speech-to-Text
   Real-time transcription
   Voice recognition

🔊 Text-to-Speech
   Natural voice synthesis

[Get API Key →]
Link: https://aistudio.google.com/app/apikey

API Key Required: Yes
Status: Not configured
```

##### 2. ElevenLabs Card

```
[ElevenLabs Logo/Icon]

ElevenLabs
─────────────────
🔊 Premium Text-to-Speech
   High-quality voices
   Voice cloning
   Multiple languages
   Natural-sounding speech

[Get API Key →]
Link: https://elevenlabs.io/app/settings/api-keys

API Key Required: Yes
Status: Not configured
```

##### 3. Browser Speech Card (Default)

```
[Browser Icon]

Browser Speech
─────────────────
🔊 Basic Text-to-Speech
   Built into your browser
   No setup needed
   Free to use
   Works offline

[No API Key Needed ✓]

API Key Required: No
Status: Always available
```

**Visual Design**:

- Cards arranged in responsive grid (3 columns desktop, 2 columns tablet, 1 column mobile)
- Each card has:
  - Provider logo/icon at top
  - Provider name as heading
  - Feature list with icons
  - "Get API Key" button (primary color) or "No API Key Needed" badge (success color)
  - Status indicator (Not configured / Always available)
- Cards are outlined with subtle border
- Hover effect shows elevation/shadow
- "Get API Key" buttons open links in new tab

**Additional Information Section**:

```
💡 Recommended Setup
─────────────────────
• Gemini: Best for AI suggestions and transcription
• ElevenLabs: Best for natural-sounding voices
• Browser Speech: Free backup option, always available

🔒 Your API Keys Are Secure
────────────────────────────
API keys are encrypted and stored securely. We never share them
with third parties. You can update or remove them anytime.
```

**Navigation**:

- **Primary CTA Button**: "Continue to Setup" (proceeds to Step 1)
  - Prominent, centered below provider cards
  - Primary color (indigo)
  - Large size for accessibility
- **Skip Option**: "I'll set this up later" link (small, muted text below button)
  - Redirects to `/talk` but shows persistent banner to complete setup

**Visual Design**:

- Hero section with welcome message at top
- Provider cards section takes main focus
- Informational callouts in subtle background colors
- Clean, spacious layout with ample whitespace
- Friendly, encouraging tone throughout
- Icons and visual hierarchy guide the eye

**Responsive Behavior**:

- **Desktop**: 3-column provider card grid
- **Tablet**: 2-column provider card grid
- **Mobile**: Single column stacked cards, full width

---

### Progress Indicator

**Location**: Top of page (below header, above content)

**Design**:

- Horizontal step indicator showing all 3 steps
- Visual states:
  - Completed: Check mark, full color (green)
  - Current: Highlighted, primary color (indigo)
  - Upcoming: Muted, gray
- Labels for each step:
  1. "API Keys"
  2. "Speech & Voice"
  3. "Suggestions"
- Show step number and total: "Step 1 of 3"

**Responsive Behavior**:

- Desktop: Full horizontal layout with labels
- Mobile: Compact dots with current step label only

---

### Step 1: API Keys Configuration

**Purpose**: Configure API keys for AI providers to enable core features

**Content Structure**:

```
[Progress Indicator: Step 1 of 3]

Heading: "Connect Your AI Providers"
Description: "September uses AI services to power speech, suggestions, and transcription. Add your API keys to get started."

[Reuse AISettingsForm component from /app/settings/ai/form.tsx]

Modifications needed:
- Remove floating save button at bottom
- Simplify to show only required providers initially (Gemini, ElevenLabs)
- Optional: Collapsible "Advanced Providers" section for additional providers
- Include inline help text and "Get API Key" links prominently

[Button Group]
- Secondary Button: "Skip for Now" (left-aligned)
- Primary Button: "Continue" (right-aligned)
```

**Validation**:

- At least one API key must be provided to enable "Continue" button
- If user clicks "Skip for Now", show warning modal:
  - "You'll have limited functionality without API keys"
  - Options: "Go Back" or "Skip Anyway"
- Store partial progress in account settings

**Form Integration**:

- Use existing `AIProviderFormData` schema
- Use `react-hook-form` with `zodResolver`
- Auto-save on field blur (optional improvement)
- Show success indicators next to validated fields

**API Key Help**:

- Gemini: Link to https://aistudio.google.com/app/apikey
- ElevenLabs: Link to https://elevenlabs.io/app/settings/api-keys
- Inline tooltips explaining what each provider enables

---

### Step 2: Speech Provider & Voice Selection

**Purpose**: Configure text-to-speech provider and select a voice

**Content Structure**:

```
[Progress Indicator: Step 2 of 3]

Heading: "Set Up Your Voice"
Description: "Choose how September will speak your messages. You can use browser speech (free) or high-quality AI voices."

[Reuse SpeechForm component from /components/ai/settings/speech-form.tsx]

Modifications needed:
- Simplify provider selection UI
- Default to browser TTS if no ElevenLabs API key provided
- Embed voice selection directly (don't link to /voices page)
- Include voice preview capability (play sample)
- Pre-populate with sensible defaults

Voice Selection Section:
- Grid of available voices based on selected provider
- Voice cards with:
  - Voice name
  - Preview button (plays "Hello, this is my voice")
  - Select button
- Filter by gender, language (if applicable)
- Search functionality for large voice lists

[Button Group]
- Secondary Button: "Back" (to Step 1)
- Secondary Button: "Skip for Now"
- Primary Button: "Continue"
```

**Default Behavior**:

- If ElevenLabs API key provided: Show ElevenLabs voices
- If no API key: Default to browser TTS with first available voice
- Pre-select a recommended voice for user

**Validation**:

- Voice selection required to enable "Continue"
- Provider settings validated based on selected provider
- Test voice functionality before proceeding (optional)

**Voice Preview**:

- Play button next to each voice
- Sample text: "Hello, my name is September. I'm here to help you communicate."
- Loading state while generating preview
- Error handling if preview fails

---

### Step 3: AI Suggestions Configuration

**Purpose**: Personalize AI suggestions with custom instructions and context

**Content Structure**:

```
[Progress Indicator: Step 3 of 3]

Heading: "Personalize Your AI Assistant"
Description: "Tell September about yourself to get better suggestions tailored to your communication style and needs."

[Reuse SuggestionsForm component from /components/ai/settings/suggestions-form.tsx]

Modifications needed:
- Simplify to show only essential fields:
  - Enable toggle (default: ON if Gemini API key provided)
  - System Instructions (required)
  - AI Corpus (optional)
- Hide advanced settings (temperature, max_suggestions, etc.) - use sensible defaults
- Expand example instructions by default to guide users
- Add more example templates specific to ALS/MND users
- Make "Generate Corpus" more prominent

Simplified Fields:
1. System Instructions (required)
   - Large textarea with character count
   - Example templates expanded by default
   - Add ALS-specific examples:
     - "ALS Patient - Family Communication"
     - "ALS Patient - Professional Work"
     - "General Assistive Communication"
   - Placeholder: "Describe yourself, your communication needs, common topics you discuss..."

2. AI Corpus (optional)
   - Collapsible section: "Add Additional Context (Optional)"
   - Generate button more prominent
   - Clear explanation of what corpus does

[Button Group]
- Secondary Button: "Back" (to Step 2)
- Secondary Button: "Skip for Now"
- Primary Button: "Complete Setup"
```

**Validation**:

- System instructions required (min 50 characters)
- AI corpus optional
- Form validates before allowing completion

**Smart Defaults**:

- Enable suggestions by default if Gemini API key provided
- Pre-populate with generic helpful instructions if user starts typing
- Set reasonable defaults for hidden advanced settings:
  - temperature: 0.7
  - max_suggestions: 5
  - context_window: 10

---

### Completion Screen

**Purpose**: Celebrate completion and guide user to start using the app

**Content Structure**:

```
[No progress indicator]

Icon: Large success check mark or celebration animation

Heading: "You're All Set!"
Subheading: "September is ready to help you communicate"

Summary Card:
✓ API Keys Configured
✓ Voice Selected: [Voice Name]
✓ AI Suggestions Enabled

Next Steps:
1. "Start Talking" - Go to main communication interface
2. "Browse Voices" - Explore more voice options
3. "Customize Settings" - Fine-tune your configuration

[Primary Button: "Start Talking" (redirects to /talk)]
[Secondary Link: "Customize Settings" (redirects to /settings)]
```

**Backend Action**:

- Set `account.onboarding_completed = true`
- Redirect to `/talk` on "Start Talking" click

---

## Technical Implementation

### Component Architecture

```typescript
/app/onboarding/
├── page.tsx              // Server component, check auth & onboarding status
├── onboarding-wizard.tsx // Client component, manages wizard state
└── steps/
    ├── welcome.tsx       // Welcome screen
    ├── api-keys.tsx      // Step 1: Wraps AISettingsForm
    ├── speech-setup.tsx  // Step 2: Wraps SpeechForm + voice selector
    ├── suggestions.tsx   // Step 3: Wraps SuggestionsForm
    └── complete.tsx      // Completion screen
```

### State Management

**Wizard State**:

```typescript
interface OnboardingState {
  currentStep: 'welcome' | 'api-keys' | 'speech' | 'suggestions' | 'complete';
  completedSteps: Set<string>;
  formData: {
    apiKeys: AIProviderFormData;
    speech: SpeechFormData;
    suggestions: SuggestionsFormData;
  };
}
```

**Navigation**:

- Use React state to track current step
- Validate current step before advancing
- Allow backward navigation without validation
- Persist progress to database on each step completion (optional)

**Data Persistence**:

- Save to `account` table after each step
- Use `updateAccount` from `AccountService`
- Handle errors gracefully with toast notifications

### Form Component Reuse Strategy

**Wrapper Pattern**:

```typescript
// Each step wraps existing form components
function ApiKeysStep({ onNext, onBack, onSkip }: StepProps) {
  const form = useForm<AIProviderFormData>({...});

  const handleSubmit = async (data: AIProviderFormData) => {
    await updateAccount({ ai_providers: data });
    onNext();
  };

  return (
    <div className="onboarding-step">
      <StepHeader
        title="Connect Your AI Providers"
        description="..."
      />
      <AIProviderFields control={form.control} />
      <StepNavigation
        onBack={onBack}
        onSkip={onSkip}
        onNext={form.handleSubmit(handleSubmit)}
      />
    </div>
  );
}
```

**Component Extraction**:

- Extract reusable form field sections from existing forms
- Create shared step navigation component
- Maintain consistent validation logic

### Modifications to Existing Components

**1. AISettingsForm (`/app/settings/ai/form.tsx`)**

- Extract `ProviderSection` as standalone component
- Export field components separately for reuse
- Keep existing form as-is for settings page

**2. SpeechForm (`/components/ai/settings/speech-form.tsx`)**

- Extract voice display section
- Create inline voice selector component (instead of linking to /voices)
- Keep provider selection logic

**3. SuggestionsForm (`/components/ai/settings/suggestions-form.tsx`)**

- Simplify to basic fields version
- Extract example instructions to shared constant
- Create "onboarding mode" prop to hide advanced settings

### Responsive Design

**Desktop (≥768px)**:

- Two-column layout for some steps
- Full step labels in progress indicator
- Larger form fields and spacing

**Mobile (<768px)**:

- Single column layout
- Compact progress indicator (dots only)
- Stacked buttons
- Simplified voice grid (1 column)

**Tablet (768px - 1024px)**:

- Adaptive layout between desktop and mobile
- 2-column voice grid

### Accessibility

**Keyboard Navigation**:

- Tab order follows logical flow
- Arrow keys navigate through steps (optional)
- Enter key submits current step
- Escape key triggers "Skip" action (with confirmation)

**Screen Readers**:

- ARIA labels on all interactive elements
- Live regions announce step changes
- Progress indicator has proper ARIA attributes
- Form validation errors announced

**Visual**:

- High contrast mode support
- Focus indicators on all interactive elements
- Sufficient color contrast (WCAG AA minimum)
- No information conveyed by color alone

### Performance Considerations

**Code Splitting**:

- Lazy load each step component
- Preload next step on current step interaction

**Data Loading**:

- Prefetch provider lists and voices
- Cache API key validation results
- Minimize re-renders during step transitions

**API Calls**:

- Debounce API key validation
- Batch account updates where possible
- Show loading states during async operations

---

## Edge Cases & Error Handling

### 1. User Already Has Partial Configuration

**Scenario**: User started onboarding before but didn't complete

**Handling**:

- Detect existing configuration on load
- Pre-fill forms with saved data
- Skip completed steps (show checkmark)
- Allow user to review/edit previous steps

### 2. API Key Validation Fails

**Scenario**: User enters invalid API key

**Handling**:

- Show inline error message
- Provide link to provider documentation
- Allow user to continue with warning
- Re-validate on page reload

### 3. Voice Preview Fails

**Scenario**: Cannot generate voice preview

**Handling**:

- Show fallback error state
- Provide text description of voice
- Allow selection without preview
- Log error for debugging

### 4. User Refreshes During Onboarding

**Scenario**: Browser refresh or navigation away

**Handling**:

- Persist progress to account settings
- Resume from last completed step
- Show "Continue where you left off" banner

### 5. No API Keys Provided

**Scenario**: User skips all API key entry

**Handling**:

- Allow continuation with browser-only features
- Show persistent banner in app: "Complete setup for full features"
- Provide easy access to settings from banner

### 6. Mobile Device Limitations

**Scenario**: Voice recording for cloning not supported

**Handling**:

- Detect device capabilities
- Hide unsupported features
- Provide alternative options (upload file)

---

## Content & Copywriting

### Tone

- **Friendly**: Conversational and approachable
- **Encouraging**: Positive reinforcement at each step
- **Clear**: No jargon, explain technical terms
- **Empathetic**: Acknowledge user's needs (ALS/MND context)

### Sample Copy

**Welcome Screen**:

- Heading: "Welcome to September"
- Subheading: "Your personal communication assistant"
- Body: "We're here to help you communicate more easily and effectively. Let's set up September together—it only takes a few minutes."

**API Keys Step**:

- Heading: "Connect Your AI Providers"
- Description: "September uses AI services like Google Gemini and ElevenLabs to power your communication. These API keys are like passwords that allow September to use these services on your behalf."
- Help Text: "Don't have an API key? Click the 'Get API Key' link to create a free account."

**Speech Step**:

- Heading: "Choose Your Voice"
- Description: "This is how September will speak your messages. You can choose from natural-sounding AI voices or use your device's built-in speech."

**Suggestions Step**:

- Heading: "Teach September About You"
- Description: "Help September understand your communication style, topics you discuss, and your personal context. The more you share, the better suggestions you'll get."

**Completion**:

- Heading: "You're Ready to Start!"
- Subheading: "September is configured and ready to help you communicate"

## Dependencies & Requirements

### Required Packages

- `react-hook-form` (already in use)
- `zod` (already in use)
- `@hookform/resolvers` (already in use)

### API Requirements

- Account update endpoint working
- Voice list API endpoint
- Voice preview generation endpoint
- API key validation (optional)

### Design Assets

- Success/completion illustrations
- Feature preview icons
- Step indicator icons

### Environment Variables

- Same as existing app configuration
- No new environment variables needed

---

## Testing Checklist

### Functional Testing

- [ ] Welcome screen displays correctly
- [ ] Progress indicator updates on step navigation
- [ ] Form validation works on each step
- [ ] Data persists between steps
- [ ] Skip functionality works
- [ ] Back navigation works
- [ ] Completion screen appears after step 3
- [ ] Account updated with onboarding_completed flag
- [ ] Redirect to /talk after completion
- [ ] Already-onboarded users redirect to /talk

### Integration Testing

- [ ] API key saving works
- [ ] Speech provider configuration saves
- [ ] Voice selection persists
- [ ] Suggestions configuration saves
- [ ] Account service integration works
- [ ] Toast notifications appear correctly

### UI/UX Testing

- [ ] Responsive design works on mobile
- [ ] Responsive design works on tablet
- [ ] Responsive design works on desktop
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Form field focus states work
- [ ] Button states (disabled, loading) work

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Focus management between steps
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA
- [ ] Form errors announced

### Edge Case Testing

- [ ] Refresh during onboarding
- [ ] Invalid API keys
- [ ] Missing required fields
- [ ] Network errors
- [ ] Partial completion resume
- [ ] Skip all steps scenario

---

## Implementation Phases

### Phase 1: Core Wizard Structure (Week 1)

- Create onboarding page route
- Build wizard state management
- Implement progress indicator
- Create welcome and completion screens
- Basic step navigation

### Phase 2: Step 1 - API Keys (Week 1)

- Extract reusable components from AISettingsForm
- Create API keys step
- Implement form validation
- Add skip functionality
- Test data persistence

### Phase 3: Step 2 - Speech Setup (Week 2)

- Extract components from SpeechForm
- Create inline voice selector
- Implement voice preview
- Add provider selection logic
- Test configuration saving

### Phase 4: Step 3 - Suggestions (Week 2)

- Simplify SuggestionsForm for onboarding
- Add example templates
- Implement corpus generation
- Test AI instructions saving

### Phase 5: Polish & Testing (Week 3)

- Responsive design refinement
- Accessibility improvements
- Error handling
- Loading states
- End-to-end testing
- User acceptance testing

---

## Open Questions

1. **Should onboarding be skippable entirely?**
   - Pro: Reduces friction for experienced users
   - Con: May lead to incomplete setup and confusion

2. **Should we persist partial progress automatically?**
   - Pro: Better UX if user navigates away
   - Con: Additional database writes, complexity

3. **Should voice preview use real API or cached samples?**
   - Pro (real): Authentic experience
   - Con (real): Costs API credits, slower

4. **How do we handle users who return after partial completion?**
   - Resume from last step?
   - Start over with pre-filled data?
   - Show summary and allow editing?

5. **Should we add a "guided tour" mode after onboarding?**
   - Could help users discover features
   - May be overwhelming immediately after setup

---

## Appendix

### Related Files

**Form Components:**

- `/app/settings/ai/form.tsx` - API keys configuration form (used in Step 1)
- `/components/ai/settings/speech-form.tsx` - Speech configuration form (used in Step 2)
- `/components/ai/settings/suggestions-form.tsx` - Suggestions configuration form (used in Step 3)
- `/components/ai/settings/transcription-form.tsx` - Transcription configuration form (future enhancement)
- `/components/ai/settings/index.ts` - Exports all AI settings components
- `/components/ai/settings/README.md` - Documentation for AI settings forms

**Modal Components:**

- `/components/ai/settings/speech-modal.tsx` - Speech settings modal
- `/components/ai/settings/suggestions-modal.tsx` - Suggestions settings modal
- `/components/ai/settings/transcription-modal.tsx` - Transcription settings modal

**Type Definitions:**

- `/types/account.ts` - Account type definitions including `onboarding_completed` flag
- `/types/ai-config.ts` - AI configuration types (AIProvider, SpeechConfig, SuggestionsConfig, etc.)

**Services:**

- `/services/account/index.ts` - Account service for CRUD operations
- `/services/ai/registry.ts` - AI provider registry with capabilities and models
- `/services/ai/context.tsx` - AI settings context provider

**Settings Pages:**

- `/app/settings/ai/page.tsx` - AI settings page (existing implementation reference)
- `/app/settings/page.tsx` - Main settings page

### Design References

- Existing settings pages for UI consistency
- Progress indicator patterns (e.g., checkout flows)
- Multi-step form best practices

### User Research Insights

- (To be added after user testing)
- ALS/MND user needs and pain points
- Caregiver perspectives
- Assistive technology compatibility requirements
