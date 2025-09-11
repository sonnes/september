# September

September is a communication assistant for people with Amyotrophic Lateral Sclerosis (ALS), Motor Neuron Disease (MND), or other speech & motor difficulties.

September is primarily designed to communicate effectively with fewer keystrokes. It can autocomplete words and phrases, based on the context of the conversation. It transcribes the audio input of others talking to you in real-time. September also extracts the important information from the conversation and displays contextually relevant shortcuts to respond.

## Features

### Text-to-Speech

September provides a choice of voices to speak out your messages. You can choose a voice that suits your style and personality. Or simply clone your voice using the voice cloning feature.

### Voice Cloning

The voice cloning tool provides a random set of sentences to read out loud. It uses these recordings to clone your voice, using Eleven Labs' technology.

### Speech-to-Text

The biggest challenge for people with motor difficulties is the time & effort it takes to type out text that fully expresses their thoughts & emotions. September provides a speech-to-text feature that transcribes conversations around you in real-time.

Thes transcriptions are then used to provide contextually relevant replies or auto-complete suggestions.

### Auto-Complete

In every conversation, September tries to predict the next words or phrases you might want to use. It uses the context of the conversation & your mood/cues to provide these suggestions.

Additionally, in every conversation, you can provide additional context in the form of notes, documents, images, videos, or links. September indexes all this information to "speak your mind" in your conversations.

## Development

This repository uses Next.js, Tailwind CSS, Tailwind UI, and is deployed on Vercel & Supabase.

### Project Structure

September follows a modular Next.js architecture with clear separation of concerns:

```
september/
├── app/                     # Next.js App Router structure
│   ├── (app)/              # App group with main application pages
│   │   ├── account/        # User account management
│   │   ├── settings/       # Application settings (AI, speech)
│   │   ├── stories/        # Story/deck management
│   │   └── talk/           # Main communication interface
│   ├── api/                # API routes for server-side functionality
│   │   ├── ai/             # AI-powered features (corpus generation)
│   │   ├── speech/         # Text-to-speech functionality
│   │   └── transcribe/     # Speech-to-text transcription
│   └── auth/               # Authentication callbacks
├── components/             # Reusable React components
│   ├── context/            # React context providers
│   ├── editor/             # Text editor with autocomplete
│   ├── home/               # Landing page components
│   ├── nav/                # Navigation components
│   ├── talk/               # Communication grid components
│   └── ui/                 # Base UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   └── autocomplete/       # Custom autocomplete implementation
├── services/               # External service integrations
│   ├── speech/             # Speech synthesis providers
│   ├── elevenlabs.ts       # ElevenLabs voice cloning
│   ├── gemini.ts          # Google Gemini AI integration
│   └── messages.ts        # Message management
├── supabase/              # Database and authentication
│   ├── migrations/        # Database schema migrations
│   └── client.ts          # Supabase client configuration
├── triplit/               # Local-first database
│   └── schema.ts          # Local database schema
└── types/                 # TypeScript type definitions
```

#### Key Directories

- **`app/`**: Next.js 13+ App Router structure with file-based routing
- **`components/`**: Organized by feature with reusable UI components
- **`hooks/`**: Custom React hooks for state management and side effects
- **`lib/`**: Pure utility functions and custom libraries (like autocomplete)
- **`services/`**: External API integrations and business logic
- **`supabase/`**: Cloud database configuration and migrations
- **`triplit/`**: Local-first database for offline functionality

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS 4
- **Database**:
  - Supabase (cloud, authentication, file storage)
  - Triplit (local-first, offline sync)
- **AI Integration**: Google Gemini API
- **Voice**: ElevenLabs for voice cloning and synthesis
- **Audio**: Voice Activity Detection (VAD) for speech recognition
- **State Management**: React Context + custom hooks
- **Forms**: React Hook Form with Zod validation

### Data

September uses a combination of local storage - Triplit, and a cloud database - Supabase, to store your data.

- Local storage is used to store your data. It is automatically synced to individual SQLite databases.
- The cloud database is used for authentication, storing your data, and for the voice cloning feature.
