# AI SDK Documentation

Documentation for AI SDK integration in September app.

## Contents

- [**Gemini Provider**](gemini.md) - Configuration and usage of Google's Gemini models via AI SDK
- [**ElevenLabs Integration**](elevenlabs.md) - Text-to-speech integration (direct API, not AI SDK)
- [**Feature Integration**](integration.md) - How AI SDK integrates with September features

## Quick Reference

### Providers in September

| Provider        | SDK              | Use Case                      | Configuration                        |
| --------------- | ---------------- | ----------------------------- | ------------------------------------ |
| **Gemini**      | `@ai-sdk/google` | AI Suggestions, Transcription | `ai_suggestions`, `ai_transcription` |
| **ElevenLabs**  | Direct API       | Text-to-Speech                | `ai_speech`                          |
| **Browser TTS** | Web Speech API   | Fallback TTS                  | `ai_speech`                          |

### Installation

```bash
# AI SDK core + Gemini provider
bun add ai @ai-sdk/google

# Zod for schema validation
bun add zod
```

## Architecture

### Provider Abstraction

```
┌─────────────────────────────────────┐
│   September Features                │
│  - AI Suggestions                   │
│  - AI Transcription                 │
│  - Text-to-Speech                   │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        v             v
┌──────────────┐ ┌──────────────┐
│   AI SDK     │ │  Direct API  │
│   (Gemini)   │ │ (ElevenLabs) │
└──────────────┘ └──────────────┘
```

### Data Flow

```
User Settings (Supabase)
  ↓
Account.ai_suggestions → Gemini (via AI SDK)
Account.ai_transcription → Gemini (via AI SDK)
Account.ai_speech → ElevenLabs (direct) or Browser TTS
  ↓
Service Layer
  ↓
Feature Implementation
```

## Configuration Schema

See [ai-config-storage.md](../specs/ai-config-storage.md) for complete schema.

### Gemini Configuration

```typescript
interface SuggestionsConfig {
  enabled: boolean;
  provider: 'gemini';
  model: 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro';
  settings: {
    temperature?: number;
    max_suggestions?: number;
    context_window?: number;
  };
}
```

### ElevenLabs Configuration

```typescript
interface SpeechConfig {
  provider: 'elevenlabs' | 'browser';
  voice_id?: string;
  settings?: {
    stability?: number;
    similarity_boost?: number;
  };
}
```

## Benefits of AI SDK

1. **Unified Interface**: Same API for multiple providers (future: OpenAI, Anthropic)
2. **Type Safety**: Full TypeScript support
3. **Streaming**: Built-in streaming for real-time responses
4. **Structured Outputs**: Native JSON schema validation
5. **Error Handling**: Consistent error types across providers
6. **React Hooks**: `useChat`, `useCompletion` for UI integration

## Migration Path

Current implementation uses `@google/genai` directly. Migration to AI SDK:

1. ✅ Keep existing service layer architecture
2. ✅ Replace `@google/genai` with `@ai-sdk/google`
3. ✅ Update service implementations to use AI SDK functions
4. ✅ Maintain data model compatibility (see integration.md)
5. ✅ Test suggestions and transcription features
6. ✅ Deploy incrementally with feature flags

## Next Steps

1. Review [integration.md](integration.md) for detailed migration guide
2. Check [gemini.md](gemini.md) for Gemini-specific configuration
3. See [elevenlabs.md](elevenlabs.md) for TTS integration patterns
