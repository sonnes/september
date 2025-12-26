# Keyboards Module

This module provides various keyboard layouts and a renderer for the September app.

## Features

- **QWERTY Keyboard**: A traditional keyboard layout.
- **Circular Keyboard**: A specialized keyboard layout for eye-tracking or alternative input.
- **Keyboard Context**: Manages keyboard visibility and type selection.
- **Keyboard Renderer**: A component that switches between different keyboard layouts.

## Components

- `KeyboardProvider`: Context provider for keyboard state.
- `KeyboardRenderer`: Main component to render the selected keyboard.
- `KeyboardToggleButton`: Button to toggle keyboard visibility.
- `QwertyKeyboard`: Traditional keyboard layout.
- `CircularKeyboard`: Circular keyboard layout using Konva.
- `CustomKeyboard`: Render custom grid keyboard from database.
- `CustomKeyboardEditor`: Create/edit custom keyboards.
- `CustomKeyboardList`: Manage custom keyboards (view/edit/delete).

## Hooks

- `useKeyboardContext`: Access the keyboard visibility and type state.
- `useShiftState`: Manage shift/caps lock state for keyboards.
- `useStageSize`: Handle responsive stage sizing for canvas-based keyboards.
- `useKeyboardInteractions`: Manage hover and interaction states for keyboard keys.
- `useCustomKeyboards`: Query custom keyboards from database.
- `useCustomKeyboard`: Query single custom keyboard by ID.
- `useCreateKeyboard`: Create new custom keyboard.
- `useUpdateKeyboard`: Update existing custom keyboard.
- `useDeleteKeyboard`: Delete custom keyboard.

## Usage

### Creating a Custom Keyboard

```tsx
import { CustomKeyboardEditor } from '@/packages/keyboards';

function CreateKeyboardPage() {
  const handleSave = (keyboard) => {
    console.log('Created:', keyboard);
  };

  return (
    <CustomKeyboardEditor
      onSave={handleSave}
      onCancel={() => router.back()}
    />
  );
}
```

### Using a Custom Keyboard

```tsx
import { CustomKeyboard } from '@/packages/keyboards';

function ChatPage() {
  const handleKeyPress = (key) => {
    console.log('Key pressed:', key);
  };

  return (
    <CustomKeyboard
      keyboardId="some-uuid"
      onKeyPress={handleKeyPress}
    />
  );
}
```

### Managing Custom Keyboards

```tsx
import { CustomKeyboardList } from '@/packages/keyboards';

function ManageKeyboardsPage() {
  const handleEdit = (keyboardId) => {
    router.push(`/keyboards/${keyboardId}/edit`);
  };

  return (
    <CustomKeyboardList
      onEdit={handleEdit}
      onSelect={(id) => console.log('Selected:', id)}
    />
  );
}
```

## Database

Custom keyboards are stored locally using TanStack DB (IndexedDB):
- Database name: `app-custom-keyboards`
- Multi-tab synchronization via BroadcastChannel
- Automatic persistence across sessions

## Architecture Decisions

### Local-First Storage
Custom keyboards use TanStack DB with IndexedDB for offline-first functionality. This ensures keyboards are available even without network connectivity and provides instant synchronization across browser tabs.

### Keyboard Type Expansion
The `KeyboardType` type was expanded from `'qwerty' | 'circular' | 'none'` to include `'custom'`. This allows custom keyboards to be selected via the same context mechanism while maintaining backwards compatibility. The specific custom keyboard ID is stored in a separate context property (`customKeyboardId`).

### Grid Layout
Custom keyboards use a responsive CSS grid layout. The number of columns is user-configurable (2-6), with mobile viewports automatically clamping to a maximum of 3 columns for usability.

### Phase 1 Limitations
This implementation provides foundation features only:
- No import/export functionality
- No drag-and-drop reordering
- No multi-page keyboards
- No button icon library (users provide URLs)

Future enhancements can build on this foundation.
