# Suggestions Module

The Suggestions module provides AI-powered typing suggestions and search history functionality for the September app.

## Features

- **AI Suggestions**: Real-time sentence and phrase completions using Gemini API.
- **Search History**: Retrieving past messages as suggestions.
- **Configurable**: Settings for model selection, system instructions, and content corpus.

## Architecture

The module is organized into:

- `components/`: UI components like `Suggestions` list and `SuggestionsForm`.
- `hooks/`: State management and API interaction hooks (`useSuggestions`, `useCorpus`).
- `types/`: Zod schemas and TypeScript interfaces.
- `lib/`: Utility functions (if any).

## Usage

### Using Suggestions in a Component

```tsx
import { Suggestions } from '@/packages/suggestions';

export function MyComponent() {
  return (
    <div>
      <Suggestions />
    </div>
  );
}
```

### Using the Hook

```tsx
import { useSuggestions } from '@/packages/suggestions';

export function MyCustomComponent() {
  const { suggestions, isLoading } = useSuggestions({ text: 'Hello', timeout: 500 });
  // ...
}
```

### Settings Form

```tsx
import { SuggestionsForm } from '@/packages/suggestions';

export function SettingsPage({ account }) {
  const handleSubmit = async data => {
    // Save settings
  };

  return <SuggestionsForm account={account} onSubmit={handleSubmit} />;
}
```
