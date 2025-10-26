# AI Provider Management

This directory contains the centralized configuration for AI providers used throughout the September application.

## Architecture Overview

The provider management system uses a **Registry Pattern** that makes it easy to add, modify, or remove AI providers without touching multiple files.

### Key Components

1. **`providers.ts`** - Provider registry with metadata
2. **`defaults.ts`** - Default configuration for AI features
3. **Form** (`/app/settings/ai/form.tsx`) - Dynamically generates UI from registry
4. **Types** (`/types/ai-config.ts`) - TypeScript types for type safety

## How to Add a New Provider

Adding a new AI provider is a **3-step process**:

### Step 1: Add Provider to Registry

Edit `lib/ai/providers.ts` and add an entry to `AI_PROVIDER_REGISTRY`:

```typescript
export const AI_PROVIDER_REGISTRY: AIProviderMetadata[] = [
  // ... existing providers ...

  {
    id: 'openai', // Unique ID for the provider
    name: 'OpenAI', // Display name shown in UI
    description: 'Used for GPT-powered suggestions and Whisper transcription',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyField: 'openai_api_key', // Form field name for API key
    baseUrlField: 'openai_base_url', // Form field name for custom URL
    configKey: 'openai', // Key in ai_providers config
    requiresApiKey: true, // Does it need an API key?
  },
];
```

### Step 2: Update TypeScript Types

Edit `types/ai-config.ts` and add the provider to `ProviderConfig`:

```typescript
export interface ProviderConfig {
  // ... existing providers ...

  openai?: {
    api_key: string;
    base_url?: string;
  };
}
```

### Step 3: That's It! 🎉

The form will automatically:

- ✅ Generate a new section for your provider
- ✅ Create form fields with validation
- ✅ Handle API key input (password field)
- ✅ Add collapsible advanced settings
- ✅ Save configuration to database

## Example: Adding Anthropic

Here's a complete example of adding Anthropic Claude:

### 1. Add to Registry (`lib/ai/providers.ts`)

```typescript
{
  id: 'anthropic',
  name: 'Anthropic',
  description: 'Used for Claude-powered AI suggestions',
  apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  apiKeyField: 'anthropic_api_key',
  baseUrlField: 'anthropic_base_url',
  configKey: 'anthropic',
  requiresApiKey: true,
}
```

### 2. Add to Types (`types/ai-config.ts`)

```typescript
export interface ProviderConfig {
  // ... other providers ...
  anthropic?: {
    api_key: string;
    base_url?: string;
  };
}
```

### 3. Result

The settings page at `/settings/ai` will now show:

```
┌─────────────────────────────────────────┐
│ Anthropic                               │
│ Used for Claude-powered AI suggestions  │
│ Get API Key →                           │
├─────────────────────────────────────────┤
│ [Anthropic API Key]                     │
│ ▼ Show Advanced Settings                │
└─────────────────────────────────────────┘
```

## Benefits of This Approach

### ✅ Maintainability

- **Single source of truth** - All provider config in one place
- **No UI changes needed** - Form generates automatically
- **Type safety** - TypeScript catches errors at compile time

### ✅ Scalability

- Add unlimited providers without code duplication
- Consistent UI/UX across all providers
- Easy to test and validate

### ✅ Flexibility

- Each provider can have unique metadata
- Support for optional vs required API keys
- Custom base URLs for proxies/self-hosting

## Form Behavior

The generated form automatically handles:

1. **API Key Input**
   - Password field (hidden text)
   - Auto-complete disabled
   - Saved encrypted in database

2. **Advanced Settings**
   - Collapsible section
   - Custom base URL input
   - Auto-expands if existing URL is set

3. **Validation**
   - API key optional (can be blank)
   - Base URL must be valid URL or empty
   - Zod schema auto-generated

4. **Persistence**
   - Saves to `account.ai_providers` field
   - Only saves providers with API keys
   - Includes base_url if provided

## Security Considerations

- ✅ API keys stored encrypted in Supabase
- ✅ Never stored in Triplit (local storage)
- ✅ Password-type inputs prevent shoulder surfing
- ✅ Keys never exposed in API responses
- ✅ Auto-complete disabled on sensitive fields

## Testing New Providers

After adding a provider:

1. **UI Test**

   ```bash
   pnpm run dev
   # Navigate to /settings/ai
   # Verify new section appears
   ```

2. **Validation Test**
   - Try submitting empty API key → should work
   - Try invalid URL → should show error
   - Try valid config → should save successfully

3. **Persistence Test**
   - Save API key
   - Reload page
   - Verify key is loaded (hidden as dots)

## Common Patterns

### Provider Without Base URL

If a provider doesn't support custom base URLs, you can still add it. The base URL field will appear in advanced settings but can be left empty.

### Provider Without API Key

For providers that don't require API keys (like browser TTS):

```typescript
{
  id: 'browser',
  name: 'Browser TTS',
  description: 'Native browser text-to-speech',
  apiKeyUrl: '#',  // No URL needed
  requiresApiKey: false,
  // ... other fields ...
}
```

## Troubleshooting

### "Provider not showing in UI"

- Check that entry exists in `AI_PROVIDER_REGISTRY`
- Verify `id` is unique
- Restart dev server

### "TypeScript errors"

- Add provider to `ProviderConfig` type
- Ensure `configKey` matches type property

### "Form not saving"

- Check browser console for errors
- Verify `configKey` matches database schema
- Ensure account service is working

## Related Files

- `/app/settings/ai/page.tsx` - Settings page layout
- `/app/settings/ai/form.tsx` - Dynamic form component
- `/types/ai-config.ts` - TypeScript type definitions
- `/lib/ai/defaults.ts` - Default configuration values

## Future Enhancements

Potential improvements to this system:

- [ ] Provider-specific validation rules
- [ ] API key testing/verification
- [ ] Provider status indicators
- [ ] Usage statistics per provider
- [ ] Cost tracking per provider
