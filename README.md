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
- **Package Manager**: [pnpm](https://pnpm.io/) (preferred) or Bun

### Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-repo/september.git
   cd september
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Environment Variables**:
   Copy the example environment file and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

   You will need API keys for:
   - **Supabase**: URL and Anon Key (for auth and cloud database)
   - **Google Gemini**: API Key (for AI suggestions and transcription)
   - **ElevenLabs**: API Key (for high-quality TTS and cloning)
   - **Google Auth**: Client ID and Secret (for Google Login)

4. **Database Setup**:
   - **Supabase**: Run the migrations in `supabase/migrations` against your Supabase project.

### Running the App

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.

## Usage

1. **Sign Up/Login**: Create an account or use the local-only mode to explore.
2. **Talk**: Use the main interface to type or use the accessible keyboard to communicate.
3. **AI Suggestions**: As you type, AI-powered suggestions will appear. Select them to speed up your communication.
4. **Voice Settings**: Configure your voice, speed, and pitch in the settings. You can also clone your own voice using the Voice Cloning tool.
5. **Contextual Info**: Upload documents or notes in the settings to help the AI understand your context better.

## Project Structure

September follows a modular architecture with a clear separation of concerns using domain-driven packages:

```
september/
├── app/                 # Next.js App Router pages (Composers for modules)
├── components/          # Reusable UI components (shadcn/ui in components/ui)
├── hooks/               # Global React hooks
├── lib/                 # Global utilities and libraries
├── packages/            # Modular features (Domain-driven)
│   ├── account/        # User account and DB synchronization
│   ├── ai/             # AI configuration and service registry
│   ├── audio/          # Audio playback and storage
│   ├── chats/          # Chat and message management
│   ├── cloning/        # Voice cloning functionality
│   ├── documents/      # Document and slide management
│   ├── editor/         # Autocomplete-enabled text editor
│   ├── keyboards/      # Custom accessible keyboards
│   ├── onboarding/     # User onboarding flow
│   ├── speech/         # TTS and voice management
│   └── suggestions/    # Contextual typing suggestions
├── services/           # External service integrations
├── supabase/           # Cloud database config & migrations
└── types/              # Global TypeScript type definitions
```

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Database**: Supabase for authentication, shared data, and file storage.
- **AI**: Google Gemini API, Vercel AI SDK
- **Voice**: ElevenLabs for voice synthesis and cloning
- **Forms**: React Hook Form + Zod validation

## Development Guidelines

- **Modules**: Always use the `packages/` structure for new features.
- **Components**: Check the `README.md` in each module directory before making changes.
- **Styles**: Follow shadcn/ui patterns and Tailwind CSS 4.
- **Icons**: Use `lucide-react` for standard icons.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
