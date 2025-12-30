# Analytics Plan 2: Event Tracking Integration

> **For Claude:** Implement this plan task-by-task.

**Date**: 2025-12-30
**Scope**: Integrate analytics tracking into editor, messages, AI, and TTS
**Dependencies**: Plan 1 (Core Infrastructure) must be complete
**Estimated Files**: 5 files to modify

---

## Overview

Add event tracking to existing modules:
- Editor keystroke tracking via `onKeyDown` (physical keyboard)
- Virtual keyboard tracking via `handleKeyPress` in chat page
- Message sent logging with combined editor stats
- AI generation logging with token usage
- TTS generation logging

---

## Tasks

### Task 1: Add keystroke tracking to useEditorLogic

**File**: `packages/editor/hooks/use-editor.ts`

Add stats tracking to the existing hook:

```typescript
// Add to imports
import { useCallback, useRef, useState } from 'react';

// Add new interface
export interface EditorStats {
  keysTyped: number;
  charsSaved: number;
}

// Inside useEditorLogic function, add:

// Stats tracking ref (reset on getAndResetStats)
const statsRef = useRef<EditorStats>({ keysTyped: 0, charsSaved: 0 });

// Track a keystroke
const trackKeystroke = useCallback(() => {
  statsRef.current.keysTyped += 1;
}, []);

// Track chars saved from suggestion
const trackCharsSaved = useCallback((chars: number) => {
  statsRef.current.charsSaved += chars;
}, []);

// Get stats and reset (call on submit)
const getAndResetStats = useCallback((): EditorStats => {
  const stats = { ...statsRef.current };
  statsRef.current = { keysTyped: 0, charsSaved: 0 };
  return stats;
}, []);

// Modify addWord to track chars saved
const addWord = useCallback((value: string) => {
  setText(prev => {
    // ... existing logic ...
    trackCharsSaved(value.length);
    return newText;
  });
}, [trackCharsSaved]);

// Modify setCurrentWord to track chars saved
const setCurrentWord = useCallback((value: string) => {
  setText(prev => {
    // ... existing logic ...
    const charsSaved = value.length - lastWord.length;
    trackCharsSaved(Math.max(0, charsSaved));
    return newText;
  });
}, [trackCharsSaved]);

// Add to return object:
return {
  // ... existing returns ...
  trackKeystroke,
  getAndResetStats,
};
```

---

### Task 2: Add onKeyDown to Editor component

**File**: `packages/editor/components/editor.tsx`

Add keystroke tracking to the textarea:

```typescript
// Get trackKeystroke from hook
const { text, setText, trackKeystroke, ...rest } = useEditorLogic();

// Add onKeyDown handler to textarea
<textarea
  value={text}
  onChange={e => setText(e.target.value)}
  onKeyDown={(e) => {
    // Track printable keys, backspace, and enter
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      trackKeystroke();
    }
  }}
  // ... other props
/>
```

---

### Task 3: Track virtual keyboard presses in chat page

**File**: `app/(app)/chats/[id]/page.tsx`

Virtual keyboards (QWERTY, Circular, Custom) fire `handleKeyPress`. Track these as keystrokes too:

```typescript
// Get trackKeystroke from editor context
const { text, setText, trackKeystroke } = useEditorContext();

const handleKeyPress = useCallback(
  (key: string) => {
    // Track virtual keyboard press (same as physical keyboard)
    trackKeystroke();

    if (key === 'ENTER') {
      handleSubmit(text);
      return;
    }

    setText(text => {
      if (key === 'BACKSPACE') {
        return text.slice(0, -1);
      } else if (key === 'SPACE') {
        return text + ' ';
      } else if (/^[0-9]$/.test(key)) {
        return text + key;
      } else {
        return text + key;
      }
    });
  },
  [text, handleSubmit, setText, trackKeystroke]
);
```

**Note**: This ensures `keys_typed` in `message_sent` events includes both:
- Physical keyboard presses (from `onKeyDown` in Editor)
- Virtual keyboard button presses (from `handleKeyPress` in chat page)

---

### Task 4: Update useCreateMessage to log events

**File**: `packages/chats/hooks/use-create-message.ts`

Add analytics logging and accept editor stats:

```typescript
// Add import
import { logMessageSent } from '@/packages/analytics';
import { useAccountContext } from '@/packages/account';

// Update CreateMessageParams interface
export interface CreateMessageParams {
  text: string;
  type?: MessageType;
  chatId?: string;
  editorStats?: {
    keysTyped: number;
    charsSaved: number;
  };
}

// Inside the hook, get user
const { user } = useAccountContext();

// After messageCollection.insert(), add:
if (user?.id) {
  logMessageSent(user.id, {
    chat_id: newMessage.chat_id ?? undefined,
    message_length: newMessage.text.length,
    has_audio: !!audioBlob,
    message_type: newMessage.type,
    keys_typed: params.editorStats?.keysTyped ?? 0,
    chars_saved: params.editorStats?.charsSaved ?? 0,
  });
}
```

---

### Task 5: Add AI generation tracking

**File**: `packages/ai/hooks/use-generate.ts`

Extract usage from Vercel AI SDK and log:

```typescript
// Add imports
import { logAIGeneration } from '@/packages/analytics';
import { useAccountContext } from '@/packages/account';

// Add feature to params interface
interface BaseGenerateParams {
  prompt: string;
  system?: string;
  temperature?: number;
  feature?: 'suggestions' | 'transcription' | 'keyboard_generation' | 'other';
}

// Inside useGenerate hook, get user
const { user } = useAccountContext();

// Modify generateObject call to extract usage:
const { object, usage } = await generateObject({
  model,
  prompt,
  system,
  temperature,
  schema: params.schema,
  output: params.output,
});

// Log after successful generation
if (usage && user?.id) {
  logAIGeneration(user.id, {
    provider: provider as 'gemini' | 'webllm',
    model: modelId,
    feature: params.feature || 'other',
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
    total_tokens: usage.totalTokens,
  });
}

// Same for generateText:
const { text, usage } = await generateText({
  model,
  prompt,
  system,
  temperature,
});

if (usage && user?.id) {
  logAIGeneration(user.id, {
    provider: provider as 'gemini' | 'webllm',
    model: modelId,
    feature: params.feature || 'other',
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
    total_tokens: usage.totalTokens,
  });
}
```

---

### Task 6: Add TTS generation tracking

**File**: `packages/speech/hooks/use-speech.ts`

Log after successful TTS generation:

```typescript
// Add imports
import { logTTSGeneration } from '@/packages/analytics';
import { useAccountContext } from '@/packages/account';

// Inside useSpeech hook, get user
const { user } = useAccountContext();

// In generateSpeech function, after successful generation:
const result = await engine?.generateSpeech({
  text,
  voice: voice,
  options: { ...speechConfig.settings, ...options },
});

if (result && user?.id) {
  logTTSGeneration(user.id, {
    provider: speechConfig.provider as 'elevenlabs' | 'gemini' | 'browser',
    model: speechConfig.model ?? undefined,
    character_count: text.length,
  });
}
```

---

## Validation

After completing all tasks:

1. Run `pnpm run lint` - should pass
2. Run `pnpm run build` - should compile
3. Manual test:
   - Type in editor (physical keyboard) → keystrokes tracked
   - Press virtual keyboard buttons → keystrokes tracked
   - Send message → `message_sent` event in IndexedDB with combined `keys_typed`
   - Trigger AI suggestion → `ai_generation` event in IndexedDB
   - Speak message → `tts_generation` event in IndexedDB

---

**END OF PLAN**
