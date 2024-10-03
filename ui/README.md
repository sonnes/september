# Recorder

Recorder is a component that continuously records the audio input from the microphone. Wheneever there is a pause in the audio input, the audio is passed to a callback function.

```tsx
<Recorder
  onAudioData={(audioData) => {
    // Do something with the audio data
  }}
  onStarted={() => {
    // Recorder has started
  }}
  onStopped={() => {
    // Recorder has stopped
  }}
/>
```

# Transcriber

Create a transcriber queue that receives audio data from the recorder and passes it to `/api/transcribe` for transcription.

Each transcription status is displayed in the message history

Create a new route `/api/transcribe` that transcribes the audio data and returns the transcription text.

Update the Recorder component to transcribe the audio data and return the transcription text. Remove the transcriber queue.

Use groq

# Assistant

Create an app that is an assistant for a person with speech difficulties.

The assistant does the following:

- Speaks the typed text
- transcribes the audio input
- shows the transcription in real-time
- maintains a history of messages

# Flashcards

Generate UI for a web app that allows users to create flashcards.

Create a landing page that starts with a search bar. When the user types a search query, the app fetches matching decks from the database and displays them as a grid of cards.

A deck has a title, description, cover image, and a count of cards.

When the user clicks on a deck, the app navigates to a page that displays the cards in the deck. The user can navigate through the cards using the arrow keys or by swiping on mobile.

Each card can have text, an image, a video, or an audio clip.
