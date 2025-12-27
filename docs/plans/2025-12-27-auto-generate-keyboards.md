# Auto-Generate Custom Keyboards and Chat Context Implementation Plan

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-27
**Goal:** Auto-generate custom keyboards with contextual phrase buttons and chat titles from first message in a chat
**Architecture:** Client-side AI generation using Google Gemini via Vercel AI SDK, integrated into existing message creation flow
**Tech Stack:** Vercel AI SDK, Google Gemini 2.5 Flash Lite, TanStack DB, React hooks

**Success Criteria:**
- [ ] All TypeScript type checks pass
- [ ] Linter passes with no errors
- [ ] First message triggers AI generation successfully
- [ ] Chat title updates from AI response (full descriptive title, max 50 chars)
- [ ] Keyboard title is separate and concise (max 2 words)
- [ ] Custom keyboard created with 24 buttons (3 words max each)
- [ ] Keyboard automatically assigned to correct chat
- [ ] Error handling works gracefully (toast notifications, console logging)
- [ ] Loading states provide clear user feedback
- [ ] Feature is non-blocking (message creation succeeds even if keyboard generation fails)
- [ ] Empty state message updated correctly

---

## Architecture Overview

### System Structure
```
packages/keyboards/
  hooks/
    use-generate-keyboard.ts     # NEW: AI keyboard generation hook
  index.ts                        # MODIFIED: Export new hook

packages/chats/
  hooks/
    use-create-message.ts         # MODIFIED: Integrate first-message detection
  components/
    message-list.tsx              # MODIFIED: Update empty state
```

### Data Flow
1. User sends first message in chat
2. `useCreateMessage` detects first message condition (messages.length === 0)
3. Message is created and saved to database (blocking)
4. After message creation, trigger `useGenerateKeyboardFromMessage` (non-blocking)
5. AI generates structured output: `{ chatTitle: string, keyboardTitle: string, buttons: string[] }`
6. Auto-create custom keyboard with generated buttons and keyboardTitle
7. Auto-update chat title with generated chatTitle
8. Show success/error feedback via toast

### Key Design Decisions

1. **Non-blocking Generation**: Message creation completes before AI generation starts. If AI fails, user still has their message.
2. **Gemini 2.5 Flash Lite**: Consistent with suggestions feature, fast enough for real-time generation.
3. **Structured Output**: Use `generateObject` with Zod schema for type-safe, validated AI responses.
4. **Separate Titles**: Generate two separate titles - full descriptive chat title (max 50 chars) and concise keyboard title (max 2 words for quick reference).
5. **Error Resilience**: Missing API key or AI errors don't break the core messaging flow.
6. **Toast Feedback**: Non-intrusive notifications for success/error states.
7. **Default Columns**: 3 columns (matches existing keyboard editor default).

### Integration Points
- **keyboards → chats**: `useGenerateKeyboardFromMessage` called from `useCreateMessage`
- **AI Settings**: Accesses Google API key via `useAISettings().getProviderConfig('google')`
- **Keyboard Creation**: Uses existing `useCreateKeyboard` hook
- **Chat Update**: Uses existing `useUpdateChat` hook

### Error Handling Strategy

**Missing API Key:**
- Silent failure (no toast, no error thrown)
- Console log: "Google API key not configured, skipping keyboard generation"
- Keyboard creation skipped, normal flow continues

**AI Generation Timeout (5+ seconds):**
- Show toast: "Keyboard generation is taking longer than expected"
- Continue waiting for response
- If eventual failure, show error toast

**AI Output Validation Error:**
- Zod schema validation fails
- Console error: "Invalid AI response format"
- Toast error: "Failed to generate keyboard suggestions"
- Keyboard creation skipped

**Network/Service Errors:**
- Catch errors from `generateObject`
- Console error with full error details
- Toast error: "Failed to generate keyboard suggestions"
- Keyboard creation skipped

**All errors are NON-BLOCKING**: Message is always created successfully.

### Testing Strategy
- **Manual Testing**: Primary validation method (no automated tests yet)
- **Test Scenarios**:
  1. Happy path: First message creates keyboard + updates title
  2. Missing API key: Message works, no keyboard created
  3. AI timeout: Message works, user sees loading state
  4. Invalid AI response: Message works, error logged
  5. Second message: No keyboard generation triggered
  6. Empty chat state: Correct message displayed

---

## Interface Definitions

### Module: keyboards/hooks/use-generate-keyboard

**File:** `/Users/raviatluri/work/september/packages/keyboards/hooks/use-generate-keyboard.ts`

**Hook Interface:**
```typescript
interface UseGenerateKeyboardFromMessageReturn {
  generateKeyboard: (params: GenerateKeyboardParams) => Promise<GeneratedKeyboardData>;
  isGenerating: boolean;
  error?: { message: string };
}

interface GenerateKeyboardParams {
  messageText: string;      // First message content
  chatId: string;           // Chat to assign keyboard to
}

interface GeneratedKeyboardData {
  chatTitle: string;        // Generated full chat title (max 50 chars)
  keyboardTitle: string;    // Generated concise keyboard title (max 2 words)
  buttons: string[];        // Array of 24 phrase starters (max 3 words each)
}
```

**AI Response Schema:**
```typescript
const KeyboardGenerationSchema = z.object({
  chatTitle: z.string().min(1).max(50),
  keyboardTitle: z.string().min(1).max(50).regex(/^(\w+\s)?(\w+)$/, 'Max 2 words'),
  buttons: z.array(z.string().max(50)).length(24),
});
```

**Hook Function Signature:**
```typescript
export function useGenerateKeyboardFromMessage(): UseGenerateKeyboardFromMessageReturn
```

**Dependencies:**
- `@ai-sdk/google` (createGoogleGenerativeAI)
- `ai` (generateObject)
- `zod` (schema validation)
- `@/packages/ai` (useAISettings)
- `react` (useState, useCallback)

**Rationale:** 
- Hook pattern consistent with existing codebase (`useSuggestions`, `useCreateKeyboard`)
- Async function allows calling after message creation
- Error object pattern matches existing query hooks
- Zod schema ensures type-safe AI responses

---

## AI Specifications

### Model Configuration
```typescript
const google = createGoogleGenerativeAI({
  apiKey: providerConfig?.api_key || '',
});

const model = google('gemini-2.5-flash-lite');
```

### System Prompt
```
You are an assistive communication expert designing custom AAC (Augmentative and Alternative Communication) keyboards for users with speech difficulties.

Your task is to generate a full chat title, a concise keyboard title, and 24 phrase starters based on the user's first message in a conversation.

Requirements:
1. Chat Title: Short, descriptive name for this conversation (max 50 characters) - used for chat context
2. Keyboard Title: Concise reference name (MAX 2 WORDS) - displayed on keyboard tabs for quick recognition
3. Buttons: Exactly 24 contextually relevant phrase starters
4. Each button text must be MAX 3 words
5. Each button text must be MAX 50 characters
6. Phrases should be complete sentence starters that help the user communicate efficiently
7. Phrases should cover common responses, follow-ups, and related topics
8. Prioritize practical, frequently-used phrases over complex sentences

Examples:
- Message: "I need to schedule my doctor appointment"
  - Chat Title: "Medical Appointments"
  - Keyboard Title: "Medical"
  - Buttons: ["Yes, please", "No, thanks", "What time?", "Morning works", "Afternoon better", ...]

- Message: "What should we have for dinner tonight?"
  - Chat Title: "Dinner Planning"
  - Keyboard Title: "Dinner"
  - Buttons: ["Sounds good", "I'm hungry", "Not sure", "Pizza?", "Chicken?", ...]
```

### User Prompt Template
```typescript
const userPrompt = `First message: "${messageText}"

Generate:
1. A full chat title (max 50 chars)
2. A concise keyboard title (max 2 words)
3. 24 phrase starters (max 3 words each)`;
```

### Request Structure
```typescript
const { object } = await generateObject({
  model: google('gemini-2.5-flash-lite'),
  schema: KeyboardGenerationSchema,
  system: KEYBOARD_GENERATION_PROMPT,
  messages: [
    {
      role: 'user' as const,
      content: userPrompt,
    },
  ],
});
```

---

## Task Breakdown

### Task 1: Create AI Generation Hook

**Objective:** Build `useGenerateKeyboardFromMessage` hook with complete AI integration

**Files:**
- CREATE: `/Users/raviatluri/work/september/packages/keyboards/hooks/use-generate-keyboard.ts`

**Implementation:**

```typescript
'use client';

import { useCallback, useState, useMemo } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { useAISettings } from '@/packages/ai';

const KEYBOARD_GENERATION_PROMPT = `You are an assistive communication expert designing custom AAC (Augmentative and Alternative Communication) keyboards for users with speech difficulties.

Your task is to generate a full chat title, a concise keyboard title, and 24 phrase starters based on the user's first message in a conversation.

Requirements:
1. Chat Title: Short, descriptive name for this conversation (max 50 characters) - used for chat context
2. Keyboard Title: Concise reference name (MAX 2 WORDS) - displayed on keyboard tabs for quick recognition
3. Buttons: Exactly 24 contextually relevant phrase starters
4. Each button text must be MAX 3 words
5. Each button text must be MAX 50 characters
6. Phrases should be complete sentence starters that help the user communicate efficiently
7. Phrases should cover common responses, follow-ups, and related topics
8. Prioritize practical, frequently-used phrases over complex sentences

Examples:
- Message: "I need to schedule my doctor appointment"
  - Chat Title: "Medical Appointments"
  - Keyboard Title: "Medical"
  - Buttons: ["Yes, please", "No, thanks", "What time?", "Morning works", "Afternoon better", ...]

- Message: "What should we have for dinner tonight?"
  - Chat Title: "Dinner Planning"
  - Keyboard Title: "Dinner"
  - Buttons: ["Sounds good", "I'm hungry", "Not sure", "Pizza?", "Chicken?", ...]`;

const KeyboardGenerationSchema = z.object({
  chatTitle: z.string().min(1).max(50),
  keyboardTitle: z.string().min(1).max(50).regex(/^(\w+\s)?(\w+)$/, 'Max 2 words'),
  buttons: z.array(z.string().max(50)).length(24),
});

interface GenerateKeyboardParams {
  messageText: string;
  chatId: string;
}

interface GeneratedKeyboardData {
  chatTitle: string;
  keyboardTitle: string;
  buttons: string[];
}

interface UseGenerateKeyboardFromMessageReturn {
  generateKeyboard: (params: GenerateKeyboardParams) => Promise<GeneratedKeyboardData>;
  isGenerating: boolean;
  error?: { message: string };
}

export function useGenerateKeyboardFromMessage(): UseGenerateKeyboardFromMessageReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string } | undefined>();

  const { getProviderConfig } = useAISettings();

  const providerConfig = useMemo(
    () => getProviderConfig('google'),
    [getProviderConfig]
  );

  const apiKey = providerConfig?.api_key;

  const google = useMemo(
    () =>
      createGoogleGenerativeAI({
        apiKey: apiKey || '',
      }),
    [apiKey]
  );

  const generateKeyboard = useCallback(
    async (params: GenerateKeyboardParams): Promise<GeneratedKeyboardData> => {
      if (!apiKey) {
        console.log('Google API key not configured, skipping keyboard generation');
        throw new Error('API key not configured');
      }

      setIsGenerating(true);
      setError(undefined);

      try {
        const { object } = await generateObject({
          model: google('gemini-2.5-flash-lite'),
          schema: KeyboardGenerationSchema,
          system: KEYBOARD_GENERATION_PROMPT,
          messages: [
            {
              role: 'user' as const,
              content: `First message: "${params.messageText}"\n\nGenerate a title and 24 phrase starters.`,
            },
          ],
        });

        if (!object?.chatTitle || !object?.keyboardTitle || !object?.buttons) {
          throw new Error('Invalid AI response format');
        }

        return {
          chatTitle: object.chatTitle,
          keyboardTitle: object.keyboardTitle,
          buttons: object.buttons,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate keyboard suggestions';
        console.error('Error generating keyboard:', err);
        setError({ message: errorMessage });
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [apiKey, google]
  );

  return {
    generateKeyboard,
    isGenerating,
    error,
  };
}
```

**Validation:**
- TypeScript compiles without errors
- Hook follows existing patterns from `useSuggestions`
- Error handling matches project standards
- Zod schema properly validates AI response

---

### Task 2: Export Hook from Keyboards Package

**Objective:** Make `useGenerateKeyboardFromMessage` available to other packages

**Files:**
- MODIFY: `/Users/raviatluri/work/september/packages/keyboards/index.ts`

**Implementation:**

Add export after line 15:
```typescript
export { useGenerateKeyboardFromMessage } from '@/packages/keyboards/hooks/use-generate-keyboard';
```

**Validation:**
- Export added to keyboards/index.ts
- No circular dependency warnings
- TypeScript build succeeds

---

### Task 3: Integrate First-Message Detection

**Objective:** Detect first message and trigger keyboard generation

**Files:**
- MODIFY: `/Users/raviatluri/work/september/packages/chats/hooks/use-create-message.ts`

**Implementation:**

1. Import required hooks (after line 8):
```typescript
import { useGenerateKeyboardFromMessage, useCreateKeyboard } from '@/packages/keyboards';
import { useUpdateChat } from './use-update-chat';
```

2. Add hook instances to `useCreateMessage` (after line 20):
```typescript
const { generateKeyboard } = useGenerateKeyboardFromMessage();
const { createKeyboard } = useCreateKeyboard();
const { updateChat } = useUpdateChat();
```

3. Modify `createMessage` function to detect first message and trigger generation (after message insertion at line 37, before updating chat timestamp at line 40):

```typescript
// Insert message
await messageCollection.insert(newMessage);

// Check if this is the first message in the chat
if (message.chat_id) {
  // Count existing messages (newMessage now exists in collection)
  const messagesQuery = await messageCollection.findAll();
  const chatMessages = messagesQuery.filter(m => m.chat_id === message.chat_id);
  
  const isFirstMessage = chatMessages.length === 1;
  
  if (isFirstMessage) {
    // Generate keyboard asynchronously (non-blocking)
    generateKeyboard({
      messageText: newMessage.text,
      chatId: message.chat_id,
    })
      .then(async (data) => {
        // Create keyboard with generated buttons and keyboard-specific title
        await createKeyboard({
          name: data.keyboardTitle,
          chat_id: message.chat_id,
          columns: 3,
          buttons: data.buttons.map(text => ({ text })),
        });

        // Update chat title with full descriptive title
        await updateChat(message.chat_id!, { title: data.chatTitle });

        toast.success('Custom keyboard generated for this chat');
      })
      .catch((err) => {
        // Silent failure if API key not configured
        if (err.message !== 'API key not configured') {
          console.error('Failed to generate keyboard:', err);
          toast.error('Failed to generate keyboard suggestions');
        }
      });
  }

  // Update chat's updated_at
  await chatCollection.update(message.chat_id, draft => {
    draft.updated_at = now;
  });
}
```

**Critical Implementation Notes:**

1. **Message Count Detection**: Query all messages after insertion to accurately count messages for this chat.
2. **Non-blocking**: Use `.then()/.catch()` instead of `await` to prevent blocking message creation.
3. **Error Handling**: Distinguish between "API key not configured" (silent) and actual errors (show toast).
4. **Success Feedback**: Show success toast when keyboard is created.
5. **Data Transformation**: Map AI-generated button strings to button objects with `text` field.

**Alternative Approach (if query performance is concern):**

Instead of querying all messages, use the `useMessages` hook result if available in parent component and pass as parameter:
```typescript
export function useCreateMessage(existingMessagesCount?: number)
```

But for Phase 1, direct query is simpler and more reliable.

**Validation:**
- Message creation succeeds regardless of keyboard generation outcome
- First message triggers generation
- Subsequent messages do NOT trigger generation
- Toast notifications appear correctly
- Chat title updates
- Keyboard appears in KeyboardRenderer

---

### Task 4: Update Empty State Message

**Objective:** Update empty message state to explain first-message behavior

**Files:**
- MODIFY: `/Users/raviatluri/work/september/packages/chats/components/message-list.tsx`

**Implementation:**

Replace lines 121-123:
```typescript
{messages.length === 0 && (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <p className="text-sm text-muted-foreground">
      Send your first message to set the context for this chat and auto-generate a custom keyboard
    </p>
  </div>
)}
```

**Validation:**
- Empty state shows new message
- Message is clear and concise
- Styling matches existing design
- No TypeScript errors

---

### Task 5: Update Documentation

**Objective:** Document AI keyboard generation feature

**Files:**
- MODIFY: `/Users/raviatluri/work/september/packages/keyboards/README.md`

**Implementation:**

Add new section after line 33 (after existing hooks list):

```markdown
- `useGenerateKeyboardFromMessage`: AI-powered keyboard generation from message context.
```

Add new section after line 92 (before "## Database"):

```markdown
### Auto-Generating Keyboards from Chat Context

The keyboards package includes AI-powered keyboard generation that automatically creates custom keyboards based on the first message in a chat.

```tsx
import { useGenerateKeyboardFromMessage } from '@/packages/keyboards';

function ChatComponent() {
  const { generateKeyboard, isGenerating } = useGenerateKeyboardFromMessage();

  const handleFirstMessage = async (messageText: string, chatId: string) => {
    try {
      const { chatTitle, keyboardTitle, buttons } = await generateKeyboard({
        messageText,
        chatId,
      });

      console.log('Generated chat title:', chatTitle);
      console.log('Generated keyboard title:', keyboardTitle);
      console.log('Generated buttons:', buttons); // Array of 24 phrases
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div>
      {isGenerating && <p>Generating keyboard...</p>}
    </div>
  );
}
```

**How It Works:**

1. User sends first message in a chat
2. AI analyzes message context using Google Gemini 2.5 Flash Lite
3. Generates full descriptive chat title (max 50 chars) - used for chat context
4. Generates concise keyboard title (max 2 words) - displayed on keyboard tabs
5. Generates 24 contextual phrase starters (max 3 words each)
6. Custom keyboard is automatically created with keyboard title and assigned to the chat
7. Chat title is updated with full descriptive AI-generated title

**Requirements:**

- Google Gemini API key configured in AI settings
- First message in chat (existing messages prevent generation)
- Non-empty message text

**Error Handling:**

- Missing API key: Silent failure, no keyboard created
- AI generation errors: Console log, toast notification
- All errors are non-blocking (message creation always succeeds)

**Configuration:**

Uses the Google API key from AI settings (same as suggestions feature). No additional configuration required.

```

**Validation:**
- Documentation is clear and complete
- Code examples are accurate
- Markdown formatting is correct
- Links work if applicable

---

## Integration & Validation

**After all tasks:**

1. **Build Check:**
```bash
cd /Users/raviatluri/work/september
pnpm run build
```

2. **Linter Check:**
```bash
pnpm run lint
```

3. **TypeScript Check:**
```bash
pnpm exec tsc --noEmit
```

4. **Manual Testing:**

**Test Case 1: Happy Path**
- [ ] Create new chat
- [ ] Send first message: "I need help with my medication schedule"
- [ ] Verify: Loading indicator appears
- [ ] Verify: Success toast shows "Custom keyboard generated for this chat"
- [ ] Verify: Chat title updates to full descriptive title (e.g., "Medication Schedule")
- [ ] Verify: Keyboard tab appears in KeyboardRenderer with concise title (max 2 words)
- [ ] Verify: Keyboard title is different from chat title if chat title is longer
- [ ] Verify: Keyboard has 24 buttons with 3-word phrases
- [ ] Verify: Clicking button inserts text

**Test Case 2: Missing API Key**
- [ ] Remove Google API key from settings
- [ ] Create new chat
- [ ] Send first message
- [ ] Verify: Message sends successfully
- [ ] Verify: No error toast appears
- [ ] Verify: Console shows "Google API key not configured"
- [ ] Verify: No keyboard created

**Test Case 3: Second Message**
- [ ] Use chat from Test Case 1
- [ ] Send second message
- [ ] Verify: No keyboard generation triggered
- [ ] Verify: Existing keyboard remains

**Test Case 4: Empty State**
- [ ] Open new chat (no messages)
- [ ] Verify: Empty state shows new message about first message setting context

**Test Case 5: Error Handling**
- [ ] Set invalid API key
- [ ] Send first message
- [ ] Verify: Error toast appears
- [ ] Verify: Message still created
- [ ] Verify: Console error logged

**Performance:**
- [ ] Keyboard generation completes within 5 seconds
- [ ] Message appears immediately (not blocked by generation)
- [ ] No UI freezing or lag

**Accessibility:**
- [ ] Toast notifications are screen-reader friendly
- [ ] Loading states clearly communicated
- [ ] Keyboard buttons are keyboard-navigable

---

## Rollback

If implementation fails or causes issues:

```bash
cd /Users/raviatluri/work/september
git diff HEAD packages/keyboards/hooks/use-generate-keyboard.ts
git diff HEAD packages/keyboards/index.ts
git diff HEAD packages/chats/hooks/use-create-message.ts
git diff HEAD packages/chats/components/message-list.tsx
git diff HEAD packages/keyboards/README.md

# If needed, reset all changes:
git checkout HEAD -- packages/keyboards/hooks/use-generate-keyboard.ts
git checkout HEAD -- packages/keyboards/index.ts
git checkout HEAD -- packages/chats/hooks/use-create-message.ts
git checkout HEAD -- packages/chats/components/message-list.tsx
git checkout HEAD -- packages/keyboards/README.md

# Remove generated file:
rm packages/keyboards/hooks/use-generate-keyboard.ts
```

---

## References

- **Existing Hooks:**
  - `/Users/raviatluri/work/september/packages/suggestions/hooks/use-suggestions.ts` (AI generation pattern)
  - `/Users/raviatluri/work/september/packages/keyboards/hooks/use-create-keyboard.ts` (Keyboard creation)
  - `/Users/raviatluri/work/september/packages/chats/hooks/use-create-message.ts` (Message creation)

- **Existing Components:**
  - `/Users/raviatluri/work/september/packages/chats/components/message-list.tsx` (Empty state)

- **Type Definitions:**
  - `/Users/raviatluri/work/september/packages/keyboards/types/index.ts` (Keyboard types)
  - `/Users/raviatluri/work/september/packages/chats/types/index.ts` (Chat/Message types)

- **AI Configuration:**
  - `/Users/raviatluri/work/september/packages/ai/components/context.tsx` (AI settings context)

- **Documentation:**
  - Vercel AI SDK: https://sdk.vercel.ai/docs
  - Google Gemini: https://ai.google.dev/docs
  - Zod: https://zod.dev

---

## Notes for Implementer

**DRY Principles:**
- Reuse `useCreateKeyboard` instead of duplicating keyboard creation logic
- Reuse `useUpdateChat` instead of direct database calls
- Follow existing AI generation pattern from `useSuggestions`

**YAGNI Guidelines:**
- Don't add regeneration functionality (can add later if needed)
- Don't add customization of button count (24 is specified requirement)
- Don't add template fallbacks (manual creation is the fallback)
- Don't add keyboard editing from this flow (use existing editor)

**Common Pitfalls:**
1. **Blocking the main thread**: Use `.then()/.catch()` not `await` for keyboard generation
2. **Race conditions**: Ensure message is inserted before checking count
3. **Toast spam**: Only show one toast per generation attempt
4. **API key errors**: Distinguish between "not configured" and "actual error"
5. **Button validation**: Ensure all 24 buttons pass Zod schema validation
6. **Chat ID null check**: Always check `message.chat_id` exists before keyboard generation

**Performance Considerations:**
- AI generation happens in background, doesn't block UI
- Use memoization for Google client creation
- Avoid re-creating callbacks on every render

**Security Considerations:**
- API key stored securely in user account settings
- No user input directly passed to system prompt (only user prompt)
- Validate all AI responses with Zod schema

**Accessibility Considerations:**
- Toast notifications for success/error feedback
- Loading states for keyboard generation
- Clear empty state messaging
