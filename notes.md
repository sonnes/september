## Bootstrapping UI

Generate a responsive UI with the following pages:

Landing page

- Landing page with a brief description of the app and a call to action to sign up
- All features briefly described, with hero images

App

Sidebar with the following options: - Conversations - Knowledge Base - Voices

Conversations

- Two columns:
  - Left column: List of conversations
  - Right column: Conversation details

Conversation Details

- Messages in the conversation
- Play icon to play each message
- Text input to send messages
- Voice input to send messages
- Settings to change voice, speed, and pitch
- Large card above the input to show transcription

## Transcription

Implement transcription.

- On click of the microphone icon, start listening to the audio.
- Show animated sound waves when listening.
- on pause/silence, stop listening and transcribe the audio.
- call `/api/transcribe` with the audio data.
- Show the transcription in the large card above the input. reusing the same function as the conversation details page.

implement `/api/transcribe`

```
import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "distil-whisper-large-v3-en",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
```

match the response structure of the conversation details page.

## Streaming transcription

https://github.com/modal-labs/quillman/blob/c9e8a0f856b1fe34f626e34584deb5fce85e2483/src/frontend/app.jsx

## Autocomplete

Implement a new component that shows suggestions as the user types. Fork Textarea and add a new component called AutocompleteTextarea. The component should have the following features:

- call `/api/autocomplete` with the text in the textarea and last 10 messages in the conversation.
- show the suggestions in a dropdown above the textarea.
- The user can navigate through the suggestions with the arrow keys.
- The user can select a suggestion by pressing tab
- when the user presses command+right arrow, accept only the first word of the suggestion.

Implement `/api/autocomplete`

- The API should accept the text and messages as request body.
- The API should return an array of suggestions.
- Construct a prompt to generate the suggestions.
- Call ollama to get the suggestions.

## Conversation Details

Change the conversation details behavior to the following:

- When the user sends a message, show the transcription in the large card, play the audio
- When submitting the transcription from microphone, show the transcription in the large card and don’t play the audio

## Sidebar

By default, keep the sidebar collapsed.

## AAC Mode

## Abacus Dictation

Create a new page called Abacus, `/abacus`. The page should have the following features:

- A radio to select - 1 Digit, 2 Digits, 3 Digits, 4 Digits
- A radio to select - Slow, Medium, Fast
- An number input to select number of numbers. default to 10
- A number input to select number of questions. default to 10
- A button to generate the dictation session

When the user clicks the button, generate the dictation session. Call `/api/abacus` with the selected options. The API returns this response:

```
{
  "digits": 3,
  "speed": "medium",
  "dictation": [
    {
      "numbers": [1, 2, 3, -5 ],
      "answer": 121
      "audio": "base64 encoded audio"
    },
    {
      "numbers": [1, 2, 3, 4, -5 ],
      "answer": 123
      "audio": "base64 encoded audio"
    }
  ]
}
```

Show the numbers in vertical columns, with answer input boxes below each column. Show a start button to start the dictation. When the user clicks the start button, play the audio for the first question. After the audio stops, pause for 2 seconds and start the next audio. After the last audio, show the answers.

### Abacus API

Implement `/api/abacus`

Request body:

```
{
  "digits": 3,
  "speed": "medium",
  "numbers": 10,
  "questions": 10
}
```

Response:

```
{
  "digits": 3,
  "speed": "medium",
  "dictation": [
    {
      "numbers": [1, 2, 3, -5 ],
      "answer": 121
      "audio": "base64 encoded audio"
    },
    {
      "numbers": [1, 2, 3, 4, -5 ],
      "answer": 123
      "audio": "base64 encoded audio"
    }
  ]
}
```

make sure sum of the numbers in each question is not less than 0.
numbers can be negative.

using the numbers, generate the audio using the following template:

```
{n1} break time="1.0s" /> {n2} ...
```

based on the speed, adjust the break time.
base64 encode the audio and return it in the response.
generate the audio for all the questions separately and parallelize the process.
