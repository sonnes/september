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

These transcriptions are then used to provide contextually relevant replies or auto-complete suggestions.

### Auto-Complete

In every conversation, September tries to predict the next words or phrases you might want to use. It uses the context of the conversation & your mood/cues to provide these suggestions.

Additionally, in every conversation, you can provide additional context in the form of notes, documents, images, videos, or links. September indexes all this information to "speak your mind" in your conversations.

## Getting Started

### Prerequisites

- **Node.js**: v20 or later
- **Package Manager**: [pnpm](https://pnpm.io/)

### Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-repo/september.git
   cd september
   ```

2. **Install dependencies**:

   ```bash
   pnpm -C apps/web install
   ```

3. **Environment Variables**:
   Copy the example environment file and fill in your credentials:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   You will need API keys for:
   - **Google Gemini**: API Key (for AI suggestions and transcription)
   - **ElevenLabs**: API Key (for high-quality TTS and cloning)

### Running the App

```bash
make dev          # or: pnpm -C apps/web dev
```

The application will be available at `http://localhost:3009`.

## Usage

1. **Start**: Open the app — it runs locally with no sign-up required.
2. **Talk**: Create a conversation space, build a message from phrases or text, then tap Speak.
3. **Notes**: Write longer prepared text inside a space, then play voice-over or export a reel.
4. **Help**: Open `/help` for a step-by-step Talk and Notes guide with screenshots.
5. **Voice Settings**: Configure your voice, speed, and pitch in settings. You can also clone your own voice using the voice cloning tool.

## Project Structure

September is a single standalone web app in `apps/web/`. Shared modules live
inside it at `src/packages/*` and are imported via the `@/packages/*` alias
(`@/*` → `src/*` in `tsconfig.json`).

```
september/
├── apps/web/                   # Web application (standalone pnpm project)
│   ├── src/
│   │   ├── routes/             # TanStack Router file routes
│   │   └── packages/           # shared modules (import via @/packages/*)
│   │       ├── shared/         # Utilities, hooks, types
│   │       ├── ui/             # shadcn/ui components
│   │       ├── ai/             # AI config & service registry
│   │       ├── audio/          # Audio playback & storage
│   │       ├── chats/          # Chat & message management
│   │       ├── cloning/        # Voice cloning
│   │       ├── documents/      # Document management
│   │       ├── editor/         # Autocomplete text editor
│   │       ├── keyboards/      # Accessible keyboards
│   │       ├── onboarding/     # User onboarding
│   │       ├── speech/         # TTS & voice management
│   │       └── suggestions/    # Contextual suggestions
│   ├── vite.config.ts
│   └── vercel.json
└── docs/                       # Plans, notes, concepts
```

## Tech Stack

- **Framework**: TanStack Start on Vite (React 19, SPA)
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Local Storage**: IndexedDB (via TanStack DB) for local-first data persistence.
- **AI**: Google Gemini API / OpenRouter, Vercel AI SDK
- **Voice**: ElevenLabs for voice synthesis and cloning
- **Forms**: React Hook Form + Zod validation

## Development Guidelines

- **Modules**: Shared code lives in `src/packages/`. Import via the `@/packages/*` alias, not relative paths.
- **App code**: Use `@/` imports for files under `src/`.
- **Components**: Check the `README.md` in each module directory before making changes.
- **Styles**: Follow shadcn/ui patterns and Tailwind CSS 4.
- **Icons**: Use `lucide-react` for standard icons.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
