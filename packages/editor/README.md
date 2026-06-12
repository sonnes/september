# @september/editor

Communication editor for September. Provides a textarea-based editor with integrated autocomplete, a rich-text TipTap editor, and the context provider that wires them together.

## Public API

```ts
import { EditorProvider, useEditorContext, Editor, TiptapEditor } from '@september/editor';
import type { EditorContextValue, EditorStats } from '@september/editor';
```

| Export | Description |
|---|---|
| `EditorProvider` | Context provider. Wrap pages that use the editor. Accepts `defaultText` and optional `chatId` for per-recipient autocomplete personalization. |
| `useEditorContext` | Access editor state and actions from any child component. Throws if called outside `EditorProvider`. |
| `Editor` | Textarea editor with built-in autocomplete chip row and submit button. Accepts `onSubmit`, `placeholder`, `disabled`, `children`. |
| `TiptapEditor` | Rich-text editor (ProseMirror / Tiptap) with Markdown support and formatting toolbar. Accepts `content`, `placeholder`, `onUpdate`, `className`. |
| `EditorContextValue` | Type for the value returned by `useEditorContext`. |
| `EditorStats` | Type for keystroke/chars-saved counters returned by `getAndResetStats`. |

### `EditorContextValue` actions

| Action | Signature | Description |
|---|---|---|
| `setText` | `(value: string \| (prev: string) => string) => void` | Replace full editor text. |
| `addWord` | `(value: string) => void` | Append a word with trailing space; tracks chars saved. |
| `setCurrentWord` | `(value: string) => void` | Complete the last partial token; tracks chars saved. |
| `appendText` | `(value: string) => void` | Append arbitrary text with trailing space. |
| `reset` | `() => void` | Clear editor text. |
| `trackKeystroke` | `() => void` | Increment keystroke counter. |
| `getAndResetStats` | `() => EditorStats` | Return and reset keystroke/chars-saved counters. |

## Internal (not exported from barrel)

`Autocomplete`, `useEditorLogic`, `useAutocomplete` are package-internal. `useAutocomplete` boots a layered language model from a shared corpus, the user's personal corpus, and chat message history; it personalizes predictions per `chatId`. These are not part of the public API.

## Usage

```tsx
import { EditorProvider, Editor, useEditorContext } from '@september/editor';

// Wrap with provider (chatId scopes autocomplete to a recipient)
export function ChatLayout({ chatId, children }) {
  return <EditorProvider chatId={chatId}>{children}</EditorProvider>;
}

// Render editor inside the provider
export function ChatPage() {
  const handleSubmit = (text: string) => { /* send message */ };
  return <Editor onSubmit={handleSubmit} />;
}

// Access state from any child
export function StatsButton() {
  const { getAndResetStats } = useEditorContext();
  return <button onClick={() => console.log(getAndResetStats())}>Stats</button>;
}
```
