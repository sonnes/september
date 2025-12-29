# Display Chat Integration Implementation Plan

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-29
**Goal:** Integrate display functionality into individual chat pages with BroadcastChannel-based popup communication
**Architecture:** Replace global Supabase realtime display with chat-scoped popup windows using BroadcastChannel API for message broadcasting
**Tech Stack:** Next.js 15 App Router, BroadcastChannel API, react-webcam, AnimatedText component, IndexedDB (existing)

**Success Criteria:**
- [ ] All tests pass (N/A - no existing tests)
- [ ] Linter passes
- [ ] Each chat has independent display popup
- [ ] Messages broadcast correctly to popup
- [ ] Popup closes when navigating away from chat
- [ ] Audio auto-plays in display popup
- [ ] Old /display route deleted

---

## Architecture Overview

### System Structure

**Before (Current):**
```
/display route (global)
  ↓ Supabase Realtime
Receives ALL user messages from ALL chats
  ↓ Display in webcam overlay
```

**After (New):**
```
/chats/[id]/page.tsx
  ↓ Button opens popup
/chats/[id]/display/page.tsx (popup window)
  ↓ BroadcastChannel listener
Receives ONLY messages from specific chat
  ↓ Display in webcam overlay
```

**Key Components:**
- **Chat Page:** Opens popup, broadcasts messages after creation
- **Display Popup:** Listens to BroadcastChannel, displays messages with webcam overlay
- **BroadcastChannel:** Same-origin communication between chat page and popup window

### Data Flow

```
User submits message in Chat Page
  ↓
createAudioMessage() saves to TanStack DB (returns message + audio blob)
  ↓
BroadcastChannel.postMessage() sends message + audio blob to display
  ↓
Display popup receives message + audio blob
  ↓
Auto-play audio directly (no download needed)
  ↓
Display animated text over webcam
```

**Key Optimization:** Audio blob is broadcast directly via BroadcastChannel, avoiding redundant Supabase download in display popup.

### Key Design Decisions

1. **BroadcastChannel vs Supabase Realtime**
   - **Decision:** Use BroadcastChannel API for popup communication
   - **Rationale:** Already proven pattern in IndexedDB collection (multi-tab sync), lightweight, local-only, no cloud dependency for display feature
   - **Trade-off:** Popup must be open to receive messages (vs persistent Supabase subscription)

2. **Message Broadcasting Pattern**
   - **Decision:** Create/close channel per message send (Option A from research)
   - **Rationale:** Don't add overhead to main chat page, display is secondary feature, BroadcastChannel creation is lightweight
   - **Alternative Considered:** Persistent channel in useEffect (adds resource to main page)

3. **Popup Window Management**
   - **Decision:** Singleton pattern with window name `display-${chatId}`
   - **Rationale:** Prevents duplicate popups, browser reuses window with same name, allows focus() on existing popup
   - **Implementation:** Check if window exists before opening, focus if exists

4. **Audio Playback**
   - **Decision:** Auto-play audio in popup only (not in main window when display is open)
   - **Rationale:** Prevents double audio playback; display is the "presentation" window
   - **Implementation:** Track popup state via ref, skip `enqueue()` in main window when popup is open
   - **Consideration:** Browser autoplay policies may require user gesture first

5. **Popup Lifecycle**
   - **Decision:** Close popup when navigating away from chat (user clarification #4)
   - **Rationale:** Each chat has its own display, switching chats should close old popup
   - **Implementation:** useEffect cleanup in chat page tracks popup reference

### Integration Points

- **Chat Page → Display Popup:** BroadcastChannel named `chat-display-${chatId}` (sends message + audio blob)
- **Display Popup → AudioPlayerProvider:** Enqueue audio blob directly for playback via `useAudioPlayer` hook (no Supabase download needed)

### Error Handling Strategy

**Chat Page:**
- Popup blocked: Silent failure (display is optional feature)
- BroadcastChannel not supported: Silent failure (feature degrades gracefully)

**Display Popup:**
- Webcam permission denied: Show black screen with text overlay only (no error message)
- No audio in message: Silent skip (message still displays)
- BroadcastChannel errors: Log to console, continue listening

**Pattern:** Display is an enhancement feature - failures should never block core chat functionality

### Testing Strategy

- **Manual Testing:** All scenarios in "Integration & Validation" section
- **Unit Tests:** Not in scope (no existing test infrastructure for UI components)
- **Integration Tests:** Not in scope (would require BroadcastChannel and window.open mocking)

---

## Interface Definitions

### Module: Display Types

**File:** `types/display.ts`

**Domain Types:**
```typescript
DisplayMessage:
  - type: 'new-message' (literal type)
  - message: Message (from packages/chats/types)
  - audio: string | undefined (base64 encoded audio blob, passed directly to avoid re-download)
  - timestamp: number (Date.now() for ordering)
```

**Type Definition:**
```typescript
import { Message } from '@/packages/chats';

export type DisplayMessage = {
  type: 'new-message';
  message: Message;
  audio?: string; // base64 encoded audio blob
  timestamp: number;
};
```

**Rationale:**
- Single message type for now (extensible to 'delete-message', 'update-message' in future)
- Timestamp allows ordering if multiple messages queued
- Uses existing Message type from chats package
- Audio blob passed directly via channel avoids redundant Supabase download in display popup

---

## Task Breakdown

### Task 1: Define Display Message Type

**Objective:** Create type-safe interface for BroadcastChannel messages

**Files:**
- Create: `types/display.ts`

**Implementation:**
```typescript
import { Message } from '@/packages/chats';

/**
 * Message types for display popup BroadcastChannel communication
 * Audio blob is passed directly to avoid redundant Supabase download in popup
 */
export type DisplayMessage = {
  type: 'new-message';
  message: Message;
  audio?: string; // base64 encoded audio blob
  timestamp: number;
};
```

**Validation:**
- TypeScript compiles without errors
- Type properly exported

**Notes:**
- Keep in root `/types` directory (follows existing pattern for shared types)
- Extensible to additional message types in future ('delete-message', 'clear-display', etc.)
- Audio is optional since some messages may not have TTS audio

---

### Task 2: Create Display Popup Route

**Objective:** Build standalone display popup component for individual chat

**Files:**
- Create: `app/(app)/chats/[id]/display/page.tsx`

**Implementation:**
```typescript
'use client';

import { use, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import Webcam from 'react-webcam';

import AnimatedText from '@/components/ui/animated-text';
import { ClientProviders } from '@/components/context/client-providers';

import { useAudioPlayer } from '@/packages/audio';
import { Message } from '@/packages/chats';

import { DisplayMessage } from '@/types/display';

function DisplayContent({ chatId }: { chatId: string }) {
  const webcamRef = useRef(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);
  const [pendingAudio, setPendingAudio] = useState<string | null>(null);
  const { enqueue } = useAudioPlayer();

  // Dynamic text sizing based on word count (from old display-client.tsx)
  const getTextSize = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 3) return 'text-8xl lg:text-9xl';
    if (wordCount <= 10) return 'text-6xl lg:text-8xl';
    if (wordCount <= 15) return 'text-4xl lg:text-6xl';
    if (wordCount <= 25) return 'text-3xl lg:text-5xl';
    return 'text-2xl lg:text-4xl';
  };

  // Dynamic positioning based on word count
  const getTextPosition = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 6) return 'pt-[30%]';
    if (wordCount <= 12) return 'pt-[20%]';
    return 'pt-[10%]';
  };

  // BroadcastChannel listener for chat-specific messages
  useEffect(() => {
    const channelName = `chat-display-${chatId}`;
    const channel = new BroadcastChannel(channelName);

    channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
      const msg = event.data;
      if (msg.type === 'new-message') {
        setLatestMessage(msg.message);
        // Audio blob passed directly via channel - no download needed
        if (msg.audio) {
          setPendingAudio(msg.audio);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [chatId]);

  // Auto-play audio when received via BroadcastChannel
  useEffect(() => {
    if (pendingAudio) {
      enqueue({ blob: pendingAudio });
      setPendingAudio(null);
    }
  }, [pendingAudio, enqueue]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Webcam Video */}
      <Webcam
        audio={false}
        ref={webcamRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video
        onUserMediaError={(error) => {
          console.warn('[Display] Webcam permission denied:', error);
          // Silent failure - will show black background with text overlay
        }}
      />

      {/* Text Overlay */}
      <div
        className={`absolute inset-0 flex items-start justify-center p-8 ${
          latestMessage ? getTextPosition(latestMessage.text) : 'pt-[33.33%]'
        }`}
      >
        <div className="text-center max-w-5xl backdrop-blur-sm rounded-2xl p-6">
          {latestMessage ? (
            <div className="space-y-4">
              <AnimatedText
                text={latestMessage.text}
                speed={400}
                className={`${getTextSize(latestMessage.text)} font-bold text-white tracking-tight bg-black/20 rounded-2xl px-4 py-2`}
              />
              <div className="text-sm md:text-base text-white/80 font-medium">
                {moment(latestMessage.created_at).fromNow()}
              </div>
            </div>
          ) : (
            <div className="text-white/60">
              <p className="text-xl md:text-2xl">Waiting for messages...</p>
            </div>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center space-x-2 text-white/80 text-lg font-medium">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);

  return (
    <ClientProviders>
      <DisplayContent chatId={chatId} />
    </ClientProviders>
  );
}
```

**Critical Points:**
1. **Blank initial state:** Starts with `latestMessage = null`, shows "Waiting for messages..." (user clarification #2)
2. **Audio via BroadcastChannel:** Audio blob passed directly from chat page - no Supabase download needed
3. **Webcam fallback:** Silent error handling - shows black background if permission denied
4. **ClientProviders wrapper:** Required for AccountProvider, AudioPlayerProvider, etc.
5. **BroadcastChannel cleanup:** Close channel on unmount
6. **No AudioService needed:** Removed dependency since audio comes via channel

**Validation:**
- TypeScript compiles without errors
- No linter errors
- Popup accessible at `/chats/{chatId}/display`

---

### Task 3: Add Display Button to Chat Page

**Objective:** Add button to open display popup with singleton pattern

**Files:**
- Modify: `app/(app)/chats/[id]/page.tsx`

**Changes:**

1. **Import display icon** (add to imports section):
```typescript
import { TvIcon } from '@heroicons/react/24/outline';
```

2. **Add popup reference state** (after other state declarations):
```typescript
const popupRef = useRef<Window | null>(null);
```

3. **Add popup handler** (after handleKeyPress):
```typescript
const handleOpenDisplay = useCallback(() => {
  // Singleton pattern: check if popup already exists
  const existingPopup = window.open('', `display-${chatId}`);
  if (existingPopup && !existingPopup.closed) {
    existingPopup.focus();
    return;
  }

  // Open new popup with mobile portrait dimensions
  const width = 375;
  const height = 667;
  const left = 100;
  const top = 100;
  
  const popup = window.open(
    `/chats/${chatId}/display`,
    `display-${chatId}`,
    `width=${width},height=${height},left=${left},top=${top},popup=1`
  );

  popupRef.current = popup;
}, [chatId]);
```

4. **Add popup cleanup** (new useEffect after other effects):
```typescript
// Close popup when navigating away from chat
useEffect(() => {
  return () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
  };
}, [chatId]);
```

5. **Add button to header** (modify SidebarLayout.Header section):
```typescript
<SidebarLayout.Header>
  <SidebarTrigger className="-ml-1" />
  <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
  {chat && <EditableChatTitle chatId={chat.id} title={chat.title} />}
  <div className="ml-auto flex items-center gap-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={handleOpenDisplay}
      className="flex items-center gap-2"
    >
      <TvIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Display</span>
    </Button>
  </div>
</SidebarLayout.Header>
```

**Critical Points:**
1. **Singleton pattern:** Reuse existing popup by window name
2. **Mobile portrait dimensions:** 375x667 matches iPhone SE
3. **Cleanup on navigation:** Close popup when chat changes
4. **useRef for popup:** Track popup window reference for cleanup
5. **Responsive button text:** Hide "Display" label on mobile

**Validation:**
- Button appears in chat header
- Clicking button opens popup window
- Clicking again focuses existing popup (doesn't open duplicate)
- Popup closes when navigating to different chat

---

### Task 4: Add Message Broadcasting

**Objective:** Broadcast messages and audio to display popup after creation

**Files:**
- Modify: `app/(app)/chats/[id]/page.tsx`

**Changes:**

1. **Import DisplayMessage type** (add to imports):
```typescript
import { DisplayMessage } from '@/types/display';
```

2. **Modify handleSubmit** (add broadcasting after createAudioMessage):

Find this section in handleSubmit:
```typescript
const { audio } = await createAudioMessage({
  chat_id: chatId,
  text: text.trim(),
  type: 'user',
  user_id: user.id,
});

if (audio) {
  enqueue(audio);
}

setText('');
```

Replace with:
```typescript
const { message, audio } = await createAudioMessage({
  chat_id: chatId,
  text: text.trim(),
  type: 'user',
  user_id: user.id,
});

// Check if display popup is open
const isDisplayOpen = popupRef.current && !popupRef.current.closed;

// Only play audio in main window if display is NOT open
if (audio && !isDisplayOpen) {
  enqueue(audio);
}

// Broadcast message + audio to display popup
const channel = new BroadcastChannel(`chat-display-${chatId}`);
channel.postMessage({
  type: 'new-message',
  message: message,
  audio: audio?.blob, // Pass audio blob directly to avoid re-download in popup
  timestamp: Date.now(),
} satisfies DisplayMessage);
channel.close();

setText('');
```

**Critical Points:**
1. **Conditional audio playback:** Only enqueue audio in main window if display popup is closed
2. **Create/close pattern:** BroadcastChannel created and closed per message
3. **Full message object:** Send complete Message object to popup
4. **Audio blob included:** Pass `audio?.blob` directly so popup doesn't need to download
5. **Timestamp:** Include Date.now() for potential ordering/filtering
6. **Type safety:** Use `satisfies DisplayMessage` for compile-time validation
7. **Use returned message:** createAudioMessage returns { message, audio }

**Validation:**
- Message appears in display popup after sending
- Audio plays in popup without network request
- Audio does NOT play in main window when display is open
- Audio plays in main window when display is closed
- BroadcastChannel properly closed (no memory leak)
- TypeScript compiles without errors

---

### Task 5: Delete Old Display Routes

**Objective:** Remove deprecated global display implementation (user clarification #3)

**Files:**
- Delete: `app/display/page.tsx`
- Delete: `app/display/display-client.tsx`

**Implementation:**
```bash
rm app/display/page.tsx
rm app/display/display-client.tsx
rmdir app/display
```

**Validation:**
- `/display` route returns 404
- No TypeScript errors from removed imports
- No remaining references to old display files

**Notes:**
- Clean break - complete removal (user clarification #3)
- Display functionality fully replaced by chat-scoped popups

---

## Integration & Validation

**After all tasks:**

1. **Build Project:**
```bash
pnpm run build
```

2. **Run Linter:**
```bash
pnpm run lint
```

3. **Manual Testing Checklist:**
   - [ ] Open chat page
   - [ ] Click "Display" button
   - [ ] Popup opens with webcam (375x667 dimensions)
   - [ ] Popup shows "Waiting for messages..."
   - [ ] Send message in chat
   - [ ] Message appears in popup within 100ms
   - [ ] Audio auto-plays in popup (NOT in main window)
   - [ ] Animated text displays correctly
   - [ ] Timestamp shows relative time
   - [ ] Click "Display" button again - focuses existing popup (no duplicate)
   - [ ] Close display popup manually
   - [ ] Send another message - audio plays in main window (display closed)
   - [ ] Navigate to different chat
   - [ ] Old popup closes automatically
   - [ ] Open display for new chat - different popup opens
   - [ ] Multiple chats can have separate popups open
   - [ ] Refresh chat page - BroadcastChannel still works
   - [ ] Close popup manually - can reopen with button
   - [ ] Deny webcam permission - black screen with text overlay (no error)

**Performance:**
- [ ] No memory leaks from unclosed BroadcastChannels
- [ ] No performance degradation in main chat page
- [ ] Popup opens instantly (<100ms)

**Browser Compatibility:**
- [ ] Test in Chrome (BroadcastChannel supported)
- [ ] Test in Firefox (BroadcastChannel supported)
- [ ] Test in Safari (BroadcastChannel supported 15.4+)

---

## Rollback

If implementation fails: 
```bash
git reset --hard origin/main
```

---

## References

- Research: `docs/research/2025-12-29-display-chat-integration.md`
- BroadcastChannel Pattern: `lib/indexeddb/collection-v2.ts` (lines 39-44, 394-403)
- Old Display Implementation: `app/display/display-client.tsx` (to be deleted)
- Message Types: `packages/chats/types/index.ts`

---

## Notes for Implementer

**DRY:**
- Reuse getTextSize() and getTextPosition() functions from old display-client.tsx
- Reuse AnimatedText component (no changes needed)
- Audio blob passed via BroadcastChannel (no need to reuse AudioService download pattern)

**YAGNI:**
- Don't add message history to display (shows only latest message)
- Don't add display controls (play/pause, volume, etc.)
- Don't add configuration UI (uses hardcoded values)
- Don't add mobile detection (let browser handle window.open behavior)

**Pitfalls:**
1. **BroadcastChannel scoping:** Must use exact channel name `chat-display-${chatId}` - typos will break communication
2. **Memory leaks:** Always close BroadcastChannel in cleanup functions
3. **Popup references:** useRef needed to track popup for cleanup, useCallback needed to avoid stale chatId
4. **Audio blob:** `audio?.blob` is optional - popup handles missing audio gracefully
5. **ClientProviders:** Display popup needs full provider tree (Account, Audio, etc.)
6. **Type imports:** Import Message from '@/packages/chats', not from Supabase types

**Browser Considerations:**
- Popup blockers may prevent window.open() - user must allow popups for site
- Mobile browsers may open popup as new tab instead of window
- Webcam requires HTTPS in production (localhost works in dev)
- Autoplay policies may block audio - requires user gesture (opening popup counts)
