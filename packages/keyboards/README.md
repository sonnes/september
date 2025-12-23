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

## Hooks

- `useKeyboardContext`: Access the keyboard visibility and type state.
- `useShiftState`: Manage shift/caps lock state for keyboards.
- `useStageSize`: Handle responsive stage sizing for canvas-based keyboards.
- `useKeyboardInteractions`: Manage hover and interaction states for keyboard keys.

## Usage

### Basic Keyboard Setup

```tsx
import { KeyboardProvider, KeyboardRenderer } from '@/packages/keyboards';

function App() {
  return (
    <KeyboardProvider>
      <KeyboardRenderer onKeyPress={key => console.log(key)} />
    </KeyboardProvider>
  );
}
```

### Using Keyboard Hooks

```tsx
import { useKeyboardContext, useShiftState } from '@/packages/keyboards';

function CustomKey({ char }) {
  const { isShiftPressed } = useShiftState();
  const { hideKeyboard } = useKeyboardContext();

  const displayChar = isShiftPressed ? char.toUpperCase() : char.toLowerCase();

  return <button onClick={hideKeyboard}>{displayChar}</button>;
}
```
