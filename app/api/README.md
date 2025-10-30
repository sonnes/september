# API Routes Directory

This directory contains all API endpoints for September. All routes are protected by authentication middleware.

## Purpose

RESTful API endpoints that handle:

- AI text generation and corpus creation
- Speech synthesis (text-to-speech)
- Speech transcription (speech-to-text)
- Text extraction from documents

## API Routes

### AI Generation

**[ai/generate-corpus/route.ts](ai/generate-corpus/route.ts)**

- **Method**: POST
- **Purpose**: Generate personalized AI corpus from user persona
- **Service**: Uses [Gemini Service](../../services/gemini.ts)
- **Authentication**: Required
- **Input**: `{ persona: string }`
- **Output**: `{ corpus: string }`

### Speech Synthesis

**[speech/route.ts](speech/route.ts)**

- **Method**: POST
- **Purpose**: Convert text to speech using ElevenLabs
- **Service**: Uses [ElevenLabs Service](../../services/elevenlabs.ts)
- **Authentication**: Required via middleware
- **Input**: `{ text: string, voiceId?: string, modelId?: string }`
- **Output**: `{ audio: string }` (base64 encoded audio)

### Speech Transcription

**[transcribe/route.ts](transcribe/route.ts)**

- **Method**: POST
- **Purpose**: Convert audio to text using speech recognition
- **Authentication**: Required
- **Input**: Audio file (multipart/form-data)
- **Output**: `{ text: string }`

### Text Extraction

**[extract-text/route.ts](extract-text/route.ts)**

- **Method**: POST
- **Purpose**: Extract text from uploaded documents (PDF, DOCX, etc.)
- **Authentication**: Required
- **Input**: Document file (multipart/form-data)
- **Output**: `{ text: string }`

## Authentication

All API routes are protected by [middleware.ts](../../middleware.ts). Requests must include a valid Supabase session cookie.

Unauthenticated requests return `401 Unauthorized`.

## Error Handling

All routes follow consistent error response format:

```json
{
  "error": "Error message description"
}
```

HTTP status codes:

- `400` - Bad request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid authentication)
- `500` - Internal server error

## Service Integration

API routes are thin wrappers around service classes:

- AI generation → [services/gemini.ts](../../services/gemini.ts)
- Speech synthesis → [services/elevenlabs.ts](../../services/elevenlabs.ts)
- Speech providers → [services/speech/](../../services/speech/)

## Environment Variables

Required environment variables:

- `GEMINI_API_KEY` - Google Gemini API key for AI generation
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice synthesis
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Related Documentation

- [Services Directory](../../services/README.md)
- [Middleware](../../middleware.ts)
- [Supabase Configuration](../../supabase/README.md)
