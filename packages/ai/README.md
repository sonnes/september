# AI Module

This module manages AI provider configurations, registries, and settings. It provides a unified interface for different AI features like suggestions, transcription, and speech.

## Features

- **Provider Registry**: A centralized list of all supported AI providers (Gemini, ElevenLabs, Browser) and their capabilities.
- **Unified Settings**: A React context (`AISettingsProvider`) to manage and persist AI preferences across the app.
- **Provider Forms**: Reusable UI components for configuring API keys and provider-specific settings.

## Structure

- `components/`: UI components for AI settings.
- `hooks/`: React hooks for accessing and updating AI settings.
- `lib/`: Core logic, provider registry, and default configurations.
- `types/`: Zod schemas and TypeScript type definitions for AI settings.

## Usage

### Using AI Settings

```tsx
import { useAISettings } from '@/packages/ai';

function MyComponent() {
  const { suggestionsConfig, updateSuggestionsConfig } = useAISettings();
  // ...
}
```

### Provider Registry

```tsx
import { AI_PROVIDERS, getProvidersForFeature } from '@/packages/ai';

const speechProviders = getProvidersForFeature('speech');
```

