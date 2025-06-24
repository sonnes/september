# Feature Implementation Plan: Editor Text-to-Speech

## 1. Introduction/Overview

This document outlines a plan to implement a new text-to-speech (TTS) feature within the existing markdown editor. The feature will allow users to select any block-level element (e.g., paragraph, heading, list item) and convert its text content into audio. The action menu for TTS will always be visible to the left of all block-level elements. The primary action will be "Play," which triggers a process to generate and stream the audio back to the user for automatic playback. **For the initial UI implementation, the Play action will simply log the selected block's text to the console.**

## 2. Goals

- **Node-based TTS:** Enable users to generate audio for individual block-level elements within the editor.
- **Intuitive UI:** Implement an action menu that is always visible to the left of every block-level element, allowing users to easily access available actions for any text block.
- **Seamless Playback:** Automatically play the generated audio without requiring extra user interaction or displaying player controls.
- **Clear Feedback:** Provide visual feedback (a loading spinner on the "Play" button) to indicate when the audio generation is in progress.
- **Backend Integration:** Leverage the existing `createUserMessage` server action to handle the speech creation process and return the audio as a base64-encoded string.

## 3. User Stories

- As a user, I want to see an action menu (with a "Play" option) always visible to the left of any paragraph, heading, or list item in the editor.
- As a user, I want to see a "Play" option in the action menu to convert the selected text block to audio.
- As a user, when I click "Play," I want the button to show a loading state so I know the audio is being generated.
- As a user, I want the generated audio for the text block to play automatically once it's ready.
- **(UI-First)** As a developer, I want to validate the UI and block selection logic by logging the selected block's text to the console before integrating backend audio generation.

## 4. Open Questions

- None at this time.

## Relevant Files

- `app/app/write/editor.tsx`: Main component housing the editor. It will manage state for the action menu and handle the audio generation calls.
- `components/markdown/editor.tsx`: The core editor component. Will be modified to include a new Tiptap extension for handling block-level actions.
- `components/markdown/action-menu.tsx`: (New file) A new component to display the action menu with the "Play" action.
- `lib/tiptap/block-actions.ts`: (New file) A new Tiptap extension to detect block-level elements and trigger the action menu.
- `app/actions/messages.ts`: Contains the `createUserMessage` server action that will generate the audio and return it as a base64-encoded string.

## Tasks (UI-First, Log Text)

- [x] 1.0 Extend Tiptap Editor
  - [x] 1.1 Create a new Tiptap extension in `lib/tiptap/block-actions.ts` that adds a `Plugin` to always show an action menu for block-level elements.
  - [x] 1.2 Ensure the action menu is rendered persistently to the left of every block-level node (not just on hover or selection).
  - [x] 1.3 Update the editor component's state with the node's text content and the coordinates for the action menu if needed.
- [x] 2.0 Implement Action Menu UI
  - [x] 2.1 Create a new component `components/markdown/action-menu.tsx`.
  - [x] 2.2 The component will take the block's position (to render to the left of the block), an `onPlay` function, and an `isLoading` flag as props.
  - [x] 2.3 Style the component so that the "Play" button is always visible to the left of each block-level element (not just on hover or selection).
- [ ] 3.0 Client-Side Action Handling (UI-First)
  - [x] 3.1 In `app/app/write/editor.tsx`, add state to manage the action menu's visibility, position, and the text of the selected node if needed.
  - [x] 3.2 Add an `isLoading` state to track the action (optional for logging).
  - [ ] 3.3 Create a `handlePlay` function that, for now, simply logs the selected node's text to the console (instead of calling the server action).
- [ ] 4.0 Backend Integration (To be done after UI is validated)
  - [x] 4.1 Update `handlePlay` to invoke the `createUserMessage` server action.
  - [x] 4.2 Pass the selected node's text and other required parameters (`id`, `type`, etc.) to the action.
  - [N/A] 4.3 The server action will return a `Message` object which should contain a base64-encoded audio string (`audioB64`) representing the generated speech.
- [x] 5.0 Audio Playback
  - [x] 5.1 After the `createUserMessage` action returns, get the base64-encoded audio string from the response. (N/A, using public URL)
  - [x] 5.2 Create a new `Audio` object and set its `src` to a data URL using the base64 audio string (e.g., `data:audio/wav;base64,...`). (N/A, using public URL)
  - [x] 5.3 Call `.play()` on the `Audio` object to start playback.
  - [x] 5.4 Once the action is complete (successfully or with an error), set `isLoading` back to `false`.

## 5. Open Questions
