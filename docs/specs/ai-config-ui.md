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

---

## Settings Page Structure

### Page Layout

```
/settings/ai
├── Provider Configuration
│   ├── Gemini Settings
│   ├── OpenAI Settings
│   ├── Anthropic Settings
│   └── ElevenLabs Settings
├── Feature Configuration
│   ├── Suggestions
│   ├── Transcription
│   └── Speech
└── Advanced Settings
    ├── Custom Base URLs
    └── Model Selection
```

---

## Component Architecture

### 1. Provider Configuration Form

```typescript
// File: app/settings/ai/provider-config-form.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAccount } from '@/services/account';
import { useToast } from '@/hooks/use-toast';

import {
  Form,
  FormInput,
  FormCheckbox,
  FormSection,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { AIProvider } from '@/types/ai-config';

const providerConfigSchema = z.object({
  gemini: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().or(z.literal('')),
  }).optional(),
  openai: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().or(z.literal('')),
    organizationId: z.string().optional(),
  }).optional(),
  anthropic: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().or(z.literal('')),
  }).optional(),
  elevenLabs: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

type ProviderConfigFormData = z.infer<typeof providerConfigSchema>;

export function ProviderConfigForm() {
  const { account, updateAccount } = useAccount();
  const { showSuccess, showError } = useToast();

  const form = useForm<ProviderConfigFormData>({
    resolver: zodResolver(providerConfigSchema),
    defaultValues: {
      gemini: account.ai_providers?.gemini || {},
      openai: account.ai_providers?.openai || {},
      anthropic: account.ai_providers?.anthropic || {},
      elevenLabs: account.ai_providers?.elevenLabs || {},
    },
  });

  const onSubmit = async (data: ProviderConfigFormData) => {
    try {
      await updateAccount({
        ai_providers: data,
      });
      showSuccess('Provider settings saved successfully');
    } catch (error) {
      showError('Failed to save provider settings');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection
          title="Google Gemini"
          description="Configure Google Gemini API for AI features"
        >
          <FormInput
            name="gemini.apiKey"
            label="API Key"
            type="password"
            placeholder="Enter your Gemini API key"
            description="Get your API key from Google AI Studio"
          />
          <FormInput
            name="gemini.baseUrl"
            label="Base URL (Optional)"
            placeholder="https://generativelanguage.googleapis.com"
            description="Custom base URL for Gemini API"
          />
        </FormSection>

        <FormSection
          title="OpenAI"
          description="Configure OpenAI API for GPT and Whisper"
        >
          <FormInput
            name="openai.apiKey"
            label="API Key"
            type="password"
            placeholder="Enter your OpenAI API key"
          />
          <FormInput
            name="openai.organizationId"
            label="Organization ID (Optional)"
            placeholder="org-..."
          />
          <FormInput
            name="openai.baseUrl"
            label="Base URL (Optional)"
            placeholder="https://api.openai.com/v1"
          />
        </FormSection>

        <FormSection
          title="Anthropic"
          description="Configure Anthropic API for Claude models"
        >
          <FormInput
            name="anthropic.apiKey"
            label="API Key"
            type="password"
            placeholder="Enter your Anthropic API key"
          />
          <FormInput
            name="anthropic.baseUrl"
            label="Base URL (Optional)"
            placeholder="https://api.anthropic.com"
          />
        </FormSection>

        <FormSection
          title="ElevenLabs"
          description="Configure ElevenLabs for voice synthesis"
        >
          <FormInput
            name="elevenLabs.apiKey"
            label="API Key"
            type="password"
            placeholder="Enter your ElevenLabs API key"
          />
          <FormInput
            name="elevenLabs.baseUrl"
            label="Base URL (Optional)"
            placeholder="https://api.elevenlabs.io"
          />
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Provider Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 2. Feature Configuration Form

```typescript
// File: app/settings/ai/feature-config-form.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAccount } from '@/services/account';
import { useToast } from '@/hooks/use-toast';
import { getProvidersForFeature } from '@/services/ai/registry';

import {
  Form,
  FormCheckbox,
  FormSelect,
  FormInput,
  FormSection,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const featureConfigSchema = z.object({
  suggestions: z.object({
    enabled: z.boolean(),
    provider: z.enum(['gemini', 'openai', 'anthropic']),
    model: z.string().optional(),
    settings: z.object({
      temperature: z.number().min(0).max(1).optional(),
      maxSuggestions: z.number().min(1).max(10).optional(),
      contextWindow: z.number().min(1).max(50).optional(),
    }).optional(),
  }),
  transcription: z.object({
    enabled: z.boolean(),
    provider: z.enum(['gemini', 'whisper', 'assembly-ai']),
    model: z.string().optional(),
    settings: z.object({
      language: z.string().optional(),
      detectLanguage: z.boolean().optional(),
      filterProfanity: z.boolean().optional(),
    }).optional(),
  }),
  speech: z.object({
    enabled: z.boolean(),
    provider: z.enum(['gemini', 'elevenlabs', 'browser']),
    voiceId: z.string().optional(),
  }),
});

type FeatureConfigFormData = z.infer<typeof featureConfigSchema>;

export function FeatureConfigForm() {
  const { account, updateAccount } = useAccount();
  const { showSuccess, showError } = useToast();

  const form = useForm<FeatureConfigFormData>({
    resolver: zodResolver(featureConfigSchema),
    defaultValues: {
      suggestions: account.ai_suggestions || DEFAULT_SUGGESTIONS_CONFIG,
      transcription: account.ai_transcription || DEFAULT_TRANSCRIPTION_CONFIG,
      speech: account.ai_speech || DEFAULT_SPEECH_CONFIG,
    },
  });

  const onSubmit = async (data: FeatureConfigFormData) => {
    try {
      await updateAccount({
        ai_suggestions: data.suggestions,
        ai_transcription: data.transcription,
        ai_speech: data.speech,
      });
      showSuccess('Feature settings saved successfully');
    } catch (error) {
      showError('Failed to save feature settings');
    }
  };

  const suggestionsProviders = getProvidersForFeature('suggestions');
  const transcriptionProviders = getProvidersForFeature('transcription');
  const speechProviders = getProvidersForFeature('speech');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormSection
          title="AI Suggestions"
          description="Get AI-powered typing suggestions while composing messages"
        >
          <FormCheckbox
            name="suggestions.enabled"
            label="Enable AI Suggestions"
          />

          <FormSelect
            name="suggestions.provider"
            label="Provider"
            options={suggestionsProviders.map(p => ({
              label: p.name,
              value: p.id,
            }))}
          />

          {/* Advanced Settings (collapsed by default) */}
          <FormInput
            name="suggestions.settings.temperature"
            label="Temperature"
            type="number"
            step="0.1"
            min="0"
            max="1"
            description="Controls randomness (0 = deterministic, 1 = creative)"
          />

          <FormInput
            name="suggestions.settings.maxSuggestions"
            label="Max Suggestions"
            type="number"
            min="1"
            max="10"
          />
        </FormSection>

        <FormSection
          title="Speech Transcription"
          description="Convert speech to text using AI"
        >
          <FormCheckbox
            name="transcription.enabled"
            label="Enable Transcription"
          />

          <FormSelect
            name="transcription.provider"
            label="Provider"
            options={transcriptionProviders.map(p => ({
              label: p.name,
              value: p.id,
            }))}
          />

          <FormCheckbox
            name="transcription.settings.detectLanguage"
            label="Auto-detect Language"
          />

          <FormCheckbox
            name="transcription.settings.filterProfanity"
            label="Filter Profanity"
          />
        </FormSection>

        <FormSection
          title="Text-to-Speech"
          description="Hear messages read aloud"
        >
          <FormCheckbox
            name="speech.enabled"
            label="Enable Text-to-Speech"
          />

          <FormSelect
            name="speech.provider"
            label="Provider"
            options={speechProviders.map(p => ({
              label: p.name,
              value: p.id,
            }))}
          />
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Feature Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 3. Provider Status Indicator

```typescript
// File: components/ai/provider-status.tsx
import { useAIFeatures } from '@/hooks/use-ai-features';
import { AIProvider } from '@/types/ai-config';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ProviderStatusProps {
  provider: AIProvider;
}

export function ProviderStatus({ provider }: ProviderStatusProps) {
  const { hasProviderConfig } = useAIFeatures();
  const isConfigured = hasProviderConfig(provider);

  if (provider === 'browser') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Ready (No API key required)</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${
      isConfigured ? 'text-green-600' : 'text-amber-600'
    }`}>
      {isConfigured ? (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Configured</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>API key required</span>
        </>
      )}
    </div>
  );
}
```

### 4. Feature Toggle Component

```typescript
// File: components/ai/feature-toggle.tsx
import { useAIFeatures } from '@/hooks/use-ai-features';
import { AIFeature } from '@/types/ai-config';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface FeatureToggleProps {
  feature: AIFeature;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function FeatureToggle({ feature, enabled, onChange }: FeatureToggleProps) {
  const { canUseFeature, getFeatureProvider } = useAIFeatures();
  const provider = getFeatureProvider(feature);
  const isUsable = canUseFeature(feature);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Switch
          checked={enabled}
          onCheckedChange={onChange}
          disabled={!isUsable && enabled}
        />
      </div>

      {enabled && !isUsable && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This feature requires an API key for {provider}.
            Please configure it in Provider Settings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

---

## User Flows

### 1. First-Time Setup Flow

```
1. User navigates to /settings/ai
2. System shows "Getting Started" guide
3. User selects primary AI provider
4. User enters API key
5. System validates API key
6. User enables desired features
7. System confirms configuration
```

### 2. Switching Provider Flow

```
1. User opens feature settings
2. User selects different provider from dropdown
3. System checks if provider is configured
4. If not configured:
   a. Show inline alert with link to provider settings
   b. User clicks link → navigates to provider config
   c. User enters API key
   d. User returns to feature settings
5. System updates feature configuration
6. User receives success confirmation
```

### 3. API Key Validation Flow

```
1. User enters API key
2. System validates format (client-side)
3. On save, system tests API key (server-side)
4. If valid:
   - Show success message
   - Enable related features
5. If invalid:
   - Show error message with details
   - Keep form editable
   - Suggest troubleshooting steps
```

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

## Testing Requirements

### Unit Tests

```typescript
// File: __tests__/components/ai/feature-config-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeatureConfigForm } from '@/app/settings/ai/feature-config-form';

describe('FeatureConfigForm', () => {
  it('should render all feature sections', () => {
    render(<FeatureConfigForm />);

    expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Speech Transcription')).toBeInTheDocument();
    expect(screen.getByText('Text-to-Speech')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<FeatureConfigForm />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Check for validation errors
    });
  });

  it('should show warning when feature enabled without API key', () => {
    render(<FeatureConfigForm />);

    // Enable feature without API key
    const toggle = screen.getByRole('switch', { name: /enable ai suggestions/i });
    fireEvent.click(toggle);

    expect(screen.getByText(/requires an API key/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// File: __tests__/integration/ai-config-flow.test.tsx
describe('AI Configuration Flow', () => {
  it('should complete full setup flow', async () => {
    // 1. Navigate to settings
    // 2. Enter API keys
    // 3. Enable features
    // 4. Verify configuration saved
    // 5. Test feature usage
  });
});
```
