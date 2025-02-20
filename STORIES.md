## Landing Page

Update landing page content to describe the app and the features. Don’t change the layout and header.

- Landing page should have a hero section with a video of the app in action.
- Each feature should have a card with:
  - 2/3 for a video/image
  - 1/3 for a title, description

## Key Features

### 1. Voice Cloning

If you are already having speech difficulties, you can clone your voice with just 30 seconds of audio.

Or instantly create a new voice from scratch using 10 sample sentences.

### 2. Real-Time Text-to-Speech

Engage in natural conversations, express emotions, and be heard. Whether you're storytelling to your kids or giving presentations at work, don't let dysphasia hold you back.

### 3. Smart Autocomplete & Transcription

Boost your typing efficiency with context-aware suggestions and auto-generated responses. September provides automatic transcription of conversations, making communication seamless and efficient.

### 4. Adaptive Keyboard Layouts

Choose from a variety of innovative keyboard designs tailored to your needs. Our adaptive layouts include:

- **AAC (Augmentative and Alternative Communication)**: Designed for accessibility
- **Circular**: Unique radial input for faster typing with eye-gaze

### 5. Diverse Voice Library

Access a wide range of high-quality voices from ElevenLabs.

## Voice Selection

- Create a new page called `/app/voices`
- Show a list of voices by calling the server action `getVoices`
- Each voice should have a name, description, and a button to select the voice
- On selecting a voice, call the server action `setVoiceId` to update the voice id in the database

## Medical Document

- On the account page, this should be the behavior:
  - If the account has `document_id` show a green checkmark and a button to delete the document
  - Clicking on the delete button should delete the document from supabase storage and update the account with `document_id` as null
  - If the account doesn't have `document_id` show a file input to upload a new document
  - Document file should be uploaded to `documents` bucket in supabase storage
  - Update the account with the `document_id`

## Welcome

- Update the welcome page to show the user a list of actions

1. Complete your account information
2. Wait for approval
3. Create a new voice
4. Send a message

Update the state of each action based on the user's progress.

Render the state of each step based on the flag in account

## Account Wizard

- Implement a step by step account wizard - `/app/account`
- 1st step: Terms and Conditions and consent
- 2nd step: Personal Information
- 3rd step: Medical Information
- Show all the steps in Layout.Header with a progress bar
- Each step should have a form in a separate client component file
- Show the current step form in Layout.Content
- Each step should have a separate server action
- 1st step should create a new account in the database
- 2nd step & 3rd step should update the account in the database

Refactor the account page to show the steps in a single page. Each step should be a separate section with its own form and submit button. Rename the step-one.tsx, step-two.tsx, step-three.tsx to consent.tsx, personal-info.tsx, medical-info.tsx.

## Authentication

- Implement authentication using next-auth
- Integrate with credentials provider
- Use drizzle adapter to store data
- Use jwt for session

## Login

- Implement a login page - `/login`
- Create a responsive layout with a form to login
- The form should have the following fields:
  - Email
  - Password
  - Login button

## Sign Up

- Implement a sign up page - `/signup`
- Create a responsive layout with a form to sign up
- The form should have the following fields:
  - Personal Information
    - Name
    - Email
    - Password
    - City
    - Country
  - Medical Information
    - Patient or Caregiver
    - Diagnosis (ALS, MS, etc.)
    - Year of Diagnosis
    - Upload diagnosis document
  - Consent
    - Brief description of data that will be shared with different parties
    - I agree to the terms and conditions
    - I agree to the privacy policy
  - Submit button

Use the existing form components. And this style:

## Voice Cloning

- Implement a voice cloning page - `/clone`
- Create a responsive layout with 2 columns
- Left column: A form to upload audio file, name, and description.
- Right column: A list of cards with the following details:

  - text on left
  - record button on right
  - clicking on record button should start recording the audio
  - a submit button at the bottom

- Encode the audio file to base64
- Call `/api/clone` with the base64 encoded audio file, name, and description.
- If recordings are present, encode them to base64 and send them in the request.
- On error, show a toast with the error message.
- On success, show a toast with the success message.

Implement `/api/clone`

- Forward the request to voice cloning api
- Decode the base64 encoded audio file and send it to the voice cloning api.

```
import { ElevenLabsClient } from "elevenlabs";
import * as fs from "fs";

const client = new ElevenLabsClient({ apiKey: "YOUR_API_KEY" });
await client.voices.add({
    files: [fs.createReadStream("/path/to/your/file")],
    name: "Alex"
});
```

## Landing Page

Create a landing page layout based on the image.

- Reuse the existing top navigation component.

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

Implement transcription as a separate component. It should be rendered on the right side of the waveform.

- On click of the microphone icon, start listening to the audio.
- Show animated circles around the microphone icon when listening.
- on pause/silence, stop listening and transcribe the audio.
- call `/api/transcribe` with the audio data.

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

The abacus dictation page should have the following features:

- A list of all generated dictations
- Each dictation is a card with the following details:
  - Digits
  - Speed
  - Numbers
  - time stamp
- Clicking on a dictation card takes user to `/abacus/dictation/<id>`
- The cards layout should be responsive.
- The first card should be a form to generate a new dictation with the following fields:
  - A radio to select - 1 Digit, 2 Digits, 3 Digits, 4 Digits
  - A radio to select - Slow, Medium, Fast
  - An number input to select number of numbers. default to 10
  - A number input to select number of questions. default to 10
  - A button to generate the dictation session
  - The form should be a separate client component.
  - The form cardshould have a loading, generating and error state.

When the user clicks the button, generate the dictation and redirect to the dictation page. Call `/api/dictation/generate` with the selected options. The API returns this response:

```
{
  "id": "123",
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

### Dictation Page

Create a new page called `/abacus/dictation/<id>`. The dictation page should have the following features:

- Fetch the dictation using the id from the url.
- Display the questions as a list of cards.
- Numbers should be shown vertically in the card. like a matrix.
- Each question should have a play button to play the audio.
- Another start button on top that starts playing the audio starting from the first question.
- A pause button to pause the audio.
- A progress bar to show the progress of the audio.
- Answers should be shown after all the questions audio is played.

### Dictation Player

Implement a player component with the following features:

- Play/Pause button
- Progress bar based on the current/total time of the audio of all the questions.
- A timer to show the time taken to answer all the questions.
- Play/Pause button on the left, progress bar on the right, timer in the middle.
- The player should play the audio of a question only after the previous question audio is finished.

### Abacus API

Implement `/api/dictation/generate`

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

## Autocomplete (transformers.js)

https://huggingface.co/docs/transformers.js/index
https://huggingface.co/tasks/fill-mask

Implement a suggestions component using Fill-Mask Pipeline.

## Inline Suggestions

Implement a new component called Editor. The component should have the following features:

- A textarea with a placeholder
- A button to submit the text
- Provide inline suggestions as the user types
- Call `/api/suggestions/inline` with the text in the textarea and previous messages. Response should be only 1 suggestion.
- Pressing tab should insert the suggestion into the textarea
- Pressing command+right arrow should accept only the first word of the suggestion.

Implement `/api/suggestions/inline`

- Call `/api/suggestions/inline` with the text in the textarea and previous messages. Response should be only 1 suggestion.
- Call ollama to get the suggestions.
- Write a appropriate system prompt to get the suggestions.

## Markov Chain

Implement a markov chain based autocomplete.

- Implement a new component called MarkovChainAutocomplete.
- The component should have the following features:
  - An input to enter the text
  - A button to submit the text
  - The suggestions should be generated using a markov chain model.
  - The suggestions should be shown as buttons above the input. Same style as the autocomplete component.
  - When the user clicks a suggestion, it should be inserted into the input.

## Messages API

- Implement a new API endpoint `GET /api/messages` using `getMessages` function.
- Implement a new API endpoint `POST /api/messages` using `createMessage` function.
- Update talk page to use the new APIs
