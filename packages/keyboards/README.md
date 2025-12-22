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

## Usage

```tsx
import { KeyboardProvider, KeyboardRenderer } from '@/packages/keyboards';

function App() {
  return (
    <KeyboardProvider>
      <KeyboardRenderer onKeyPress={(key) => console.log(key)} />
    </KeyboardProvider>
  );
}
```

