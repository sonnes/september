## Feature Implementation Plan: Play Button for Each Paragraph in Tiptap Editor

### 1. Introduction/Overview

This feature adds a custom node view to the Tiptap-based markdown editor, displaying a play button at the start of each paragraph. The play button will allow users to trigger audio playback (text-to-speech) for the paragraph's content. For the initial implementation, clicking the play button will log the action. The feature will include visual feedback for loading, playing, and error states, and use Heroicons for the button.

### 2. Goals

- Display a play button inline at the start of every paragraph node in the editor.
- On click, log the paragraph's text content (placeholder for future audio playback).
- Provide visual feedback for loading, playing, and error states.
- Use Heroicons for the play button.
- Ensure the feature is accessible and works for all users of the editor.

### 3. User Stories

- **As a user**, I want to see a play button next to each paragraph so I can play (or in this version, log) the paragraph's content.
- **As a user**, I want to see visual feedback when the play button is loading, playing, or if there's an error.
- **As a user**, I want the play button to be visually consistent with the rest of the editor (using Heroicons).

### 4. Tasks (Parent Tasks Only)

- [ ] 1.0 Design and implement a custom Tiptap node view for paragraphs with a play button.

  - [x] 1.1 Create a new React component for the paragraph node view (`paragraph-play-nodeview.tsx`).
  - [x] 1.2 Define a Tiptap extension for the custom paragraph node view (`paragraph-play-extension.ts`).
  - [x] 1.3 Integrate the custom node view extension into the editor's extension list (`editor.tsx`).
  - [x] 1.4 Ensure the play button appears inline at the start of each paragraph.
  - [x] 1.5 Add state management for visual feedback (loading, playing, error) in the node view component.

- [ ] 2.0 Integrate Heroicons play icon into the custom node view.

  - [x] 2.1 Add/import the Heroicons play icon to the project (e.g., in `components/icons/heroicons.tsx`).
  - [x] 2.2 Use the Heroicons play icon in the play button within the node view component.
  - [x] 2.3 Style the play button to match the editor's design system.

- [ ] 3.0 Implement click handler to log paragraph content and manage visual feedback states (loading, playing, error).
  - [x] 3.1 Implement a click handler that logs the paragraph's text content.
  - [x] 3.2 Update the node view's state to show loading, playing, and error feedback as appropriate.
  - [x] 3.3 Ensure only one paragraph can be in the 'playing' state at a time (optional for future audio playback).

## Relevant Files

- `app/app/write/markdown/editor.tsx` - Main Tiptap editor component where the custom node view integration will occur.
- `app/app/write/markdown/paragraph-play-nodeview.tsx` - New file for the custom paragraph node view with play button logic and UI.
- `components/icons/heroicons.tsx` - (If not existing) Central location for importing and exporting Heroicons used in the editor.
- `lib/tiptap/paragraph-play-extension.ts` - (New) Tiptap extension definition for the custom paragraph node view.
- `README.md` - Update documentation to describe the new feature and usage.

### 5. Open Questions

- Should the play button be hidden or disabled in read-only mode?
- Are there any specific accessibility requirements (e.g., ARIA labels, focus management)?
- Should the visual feedback states be animated or static?
