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

This repository uses Next.js, Tailwind CSS, Tailwind UI, and is deployed on Cloudflare.

### Data

September uses a combination of local storage - Triplit, and a cloud database - Supabase, to store your data.

- Local storage is used to store your data. It is automatically synced to individual SQLite databases.
- The cloud database is used for authentication, storing your data, and for the voice cloning feature.
