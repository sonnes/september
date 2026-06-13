# @/packages/keyboards

Typing keyboard layouts for the September AAC app. Provides QWERTY and Circular keyboard components with a shared context provider.

## Public API

```ts
import {
  KeyboardProvider,
  KeyboardRenderer,
  KeyboardToggleButton,
} from '@/packages/keyboards';
import type { KeyboardType } from '@/packages/keyboards';
```

### Components

**`KeyboardProvider`** — context provider; wrap the area that contains a `KeyboardRenderer` and `KeyboardToggleButton`.

Props:
- `defaultVisible?: boolean` — initial visibility (default: `true`)
- `defaultKeyboardType?: KeyboardType` — `'qwerty'` or `'circular'` (default: `'qwerty'`)

**`KeyboardRenderer`** — renders QWERTY and Circular keyboards in a tab strip.

Props:
- `onKeyPress: (key: string) => void`
- `className?: string`

**`KeyboardToggleButton`** — button that shows/hides the keyboard via `KeyboardProvider` context.

### Types

```ts
type KeyboardType = 'qwerty' | 'circular' | 'none';
```

## Storage

No storage. QWERTY and Circular are stateless layouts. Keyboard visibility and active type are held in `KeyboardProvider` context (memory only).

## Internal structure

`QwertyKeyboard` and `CircularKeyboard` are rendered by `KeyboardRenderer` and are not exported from the package root. `useKeyboardContext` is internal.
