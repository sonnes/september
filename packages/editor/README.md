# Editor Module

The Editor module provides the communication interface for the September app, including autocomplete and text entry.

## Features

- **Editor**: A textarea-based editor with integrated autocomplete.
- **TiptapEditor**: A rich-text editor based on Tiptap with Markdown support.
- **Autocomplete**: Phrase and word completion system based on local dictionary and synthetic corpus.
- **Context**: Centralized state management for editor text and operations.

## Architecture

- `components/`: UI components (`Editor`, `TiptapEditor`, `Autocomplete`).
- `hooks/`: Editor state hooks (`useEditor`).
- `context/`: Editor state management (`EditorProvider`).

## Hooks

- `useEditor`: Access the editor context for text state and operations.

Note: The `useAutocomplete` hook is now a global hook located in `/hooks/use-autocomplete.ts`. It can be configured to include message history using the `includeMessages` option.

## Usage

### Using the Editor with Autocomplete

```tsx
import { Editor, EditorProvider } from '@/packages/editor';

export function MyPage() {
  const handleSubmit = (text: string) => {
    console.log('Submitted:', text);
  };

  return (
    <EditorProvider>
      <Editor onSubmit={handleSubmit} />
    </EditorProvider>
  );
}
```

### Accessing Editor State

```tsx
import { useEditorContext } from '@/packages/editor';

export function CustomComponent() {
  const { text, setText } = useEditorContext();
  // ...
}
```
