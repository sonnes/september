# Services Directory

Server-side service integrations for AI and voice providers.

## Purpose

This directory contains service classes that wrap external API integrations. These are used by API routes to handle:

- AI text generation and suggestions
- Speech synthesis (text-to-speech)
- Audio transcription (speech-to-text)
- Document text extraction

## Services

### GeminiService

**File**: [gemini.ts](gemini.ts)

Google Gemini AI integration for:

- **Suggestions**: AI-powered sentence completions
- **Transcription**: Audio-to-text conversion
- **Text Extraction**: Extract text from documents and images
- **Corpus Generation**: Generate synthetic training data

```typescript
import GeminiService from '@/services/gemini';

const gemini = new GeminiService(process.env.GEMINI_API_KEY);

// Generate suggestions
const { suggestions } = await gemini.generateSuggestions({
  instructions: 'Be helpful',
  text: 'Hello',
  messages: [],
});

// Transcribe audio
const { text } = await gemini.transcribeAudio({ audio: audioBlob });

// Extract text from documents
const text = await gemini.extractText({ files: [pdfBlob] });
```

### ElevenLabs

**File**: [elevenlabs.ts](elevenlabs.ts)

ElevenLabs voice synthesis integration:

- **Text-to-Speech**: Convert text to natural speech
- **Word Alignment**: Character-level timing for text highlighting

```typescript
import { generateSpeech } from '@/services/elevenlabs';

const { blob, alignment } = await generateSpeech({
  text: 'Hello world',
  voiceId: 'voice-id',
});
```

## Environment Variables

Required environment variables:

```env
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

## Usage in API Routes

Services are instantiated and used in API routes:

```typescript
// app/api/speech/route.ts
import { generateSpeech } from '@/services/elevenlabs';

export async function POST(request: Request) {
  const { text, voiceId } = await request.json();
  const { blob, alignment } = await generateSpeech({ text, voiceId });
  return Response.json({ audio: blob, alignment });
}
```

## Related

- [API Routes](../app/api/README.md) - API endpoints using these services
- [@september/speech](../../../packages/speech/README.md) - Client-side speech integration
- [@september/ai](../../../packages/ai/README.md) - AI settings and configuration
