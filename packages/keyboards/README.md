# @september/keyboards

Keyboard layouts and custom keyboard management for the September AAC app.

## Public API

```ts
import {
  KeyboardProvider,
  KeyboardRenderer,
  KeyboardToggleButton,
  createKeyboard,
  useGenerateKeyboardFromMessage,
} from '@september/keyboards';
import type { CustomKeyboard, CreateCustomKeyboardData } from '@september/keyboards';
```

### Components

**`KeyboardProvider`** — context provider; wrap the area that contains a `KeyboardRenderer` and `KeyboardToggleButton`.

**`KeyboardRenderer`** — renders all keyboard types (QWERTY, Circular, and any custom keyboards) in a tab strip. Custom keyboard editor is included.

Props:
- `chatId?: string` — when set, shows keyboards assigned to this chat or unassigned (`chat_id` null/undefined). When unset, shows only global keyboards.
- `onKeyPress: (key: string) => void`
- `stickyQwerty?: boolean` — when true, QWERTY/Circular live in a persistent group below the custom keyboard tab strip instead of sharing the same tab strip.
- `className?: string`

**`KeyboardToggleButton`** — button that shows/hides the keyboard via `KeyboardProvider` context.

### Mutation

**`createKeyboard(data: CreateCustomKeyboardData): Promise<CustomKeyboard>`**

Plain async function. Assigns nanoid ids to the keyboard and each button, assigns `order` (0-indexed), defaults `columns` to 4. Awaits `tx.isPersisted.promise` before returning — throws on persistence failure. Toast lives at the call site.

```ts
const keyboard = await createKeyboard({
  name: 'Medical Terms',
  user_id: user.id,
  chat_id: chatId,   // optional: assign to a specific chat
  columns: 3,
  buttons: [{ text: 'I need help' }, { text: 'Call the nurse' }],
});
```

`updateKeyboard` and `deleteKeyboard` are internal to the package (used by `KeyboardRenderer` / `CustomKeyboardEditor`) and are not exported.

### Hook

**`useGenerateKeyboardFromMessage`** — AI keyboard generation from a message string. Calls Google Gemini via `@september/ai`. Returns `{ generateKeyboard, isGenerating, error }`.

`generateKeyboard({ messageText, chatId })` resolves with `{ chatTitle, keyboardTitle, buttons: string[] }` (24 phrases). Throws `Error('API key not configured')` when no API key is set — callers should silence that specific error.

## Data layout

`CustomKeyboard`:
```ts
{
  id: string;         // nanoid
  user_id: string;
  name: string;       // displayed on the keyboard tab
  buttons: GridButton[];
  chat_id?: string;   // undefined/null = global; set = chat-specific
  columns: number;    // 2–6, default 4
  created_at: Date;
  updated_at: Date;
}

GridButton: { id, text, value?, image_url?, order }
```

**`chat_id` query rationale:** `useCustomKeyboards` returns keyboards where `chat_id` is null, undefined, or matches the current `chatId`. This means global keyboards always appear alongside chat-specific ones — there is no "hide global" mode.

## Storage

IndexedDB via TanStack DB. Database: `app-custom-keyboards`. Multi-tab sync via BroadcastChannel.

## Internal structure

Components `QwertyKeyboard`, `CircularKeyboard`, `CustomKeyboard`, and `CustomKeyboardEditor` are rendered by `KeyboardRenderer` and are not exported from the package root. Hooks `useCustomKeyboards`, `useCustomKeyboard`, `useShiftState`, `useStageSize`, `useKeyboardInteractions`, and `useKeyboardContext` are internal. Mutations `updateKeyboard` and `deleteKeyboard` are internal.
