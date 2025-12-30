# AI-Generated Keyboard Buttons Integration Plan

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-30  
**Goal:** Add AI-powered button generation to manual keyboard creation flow in CustomKeyboardEditor  
**Architecture:** Integrate existing `useGenerateKeyboardFromMessage` hook into editor form with single-line context input  
**Tech Stack:** React Hook Form, Zod validation, Google Gemini via useGenerate hook, existing keyboard infrastructure  

**Success Criteria:**
- [ ] Linter passes
- [ ] Context input field accepts user input
- [ ] Generate button triggers AI generation with loading state
- [ ] Generated buttons REPLACE existing buttons in form
- [ ] Keyboard name auto-populates from AI response
- [ ] Columns value preserved during generation
- [ ] Missing API key shows clear error message
- [ ] Manual editing works after generation
- [ ] Form submission creates keyboard correctly

---

## Architecture Overview

### System Structure

**Current Manual Creation Flow:**
```
User fills name → User sets columns → User adds buttons manually → Submit
```

**New AI-Enhanced Flow:**
```
User enters context → Click "Generate" → AI fills name + buttons → User reviews/edits → Submit
```

**Key Components:**
- **CustomKeyboardEditor:** Form component with AI generation integration
- **useGenerateKeyboardFromMessage:** Existing hook that generates keyboard data from text
- **React Hook Form:** Manages form state and validation
- **useFieldArray:** Manages dynamic button fields (uses `replace()` method for AI generation)

### Data Flow

```
User enters context text ("Planning a birthday party")
  ↓
Click "Generate Buttons"
  ↓
useGenerateKeyboardFromMessage.generateKeyboard(context, '')
  ↓
useGenerate calls Gemini API with structured schema
  ↓
Returns { chatTitle, keyboardTitle, buttons: string[24] }
  ↓
form.setValue('name', keyboardTitle) - Auto-populate name
  ↓
fieldArray.replace(buttons) - Replace all buttons
  ↓
User reviews/edits generated buttons
  ↓
Submit form → createKeyboard → IndexedDB
```

**Key Optimization:** Hook returns exactly 24 buttons matching form schema (1-50 chars), no transformation needed.

### Key Design Decisions

1. **Replace vs Append Buttons**
   - **Decision:** REPLACE existing buttons with generated ones
   - **Rationale:** User decision #1, cleaner UX, predictable 24-button output
   - **Implementation:** Use `fieldArray.replace()` instead of `fieldArray.append()`

2. **Context Input Type**
   - **Decision:** Single-line Input component (not textarea)
   - **Rationale:** User decision #2, simpler UX, prompts concise descriptions
   - **Implementation:** Use `<Input>` with placeholder like "Describe the conversation topic"

3. **Auto-populate Keyboard Name**
   - **Decision:** YES - Auto-fill name field from `keyboardTitle`
   - **Rationale:** User decision #3, reduces friction, user can still edit
   - **Implementation:** `form.setValue('name', keyboardTitle)` after generation

4. **Columns Behavior**
   - **Decision:** KEEP existing columns value, don't reset
   - **Rationale:** User decision #4, preserves user's layout preference
   - **Implementation:** Don't call `form.setValue('columns', ...)` during generation

5. **Button Limit After Generation**
   - **Decision:** NO additional buttons allowed (keep existing 50-button max)
   - **Rationale:** User decision #5, maintain existing form behavior
   - **Implementation:** No changes to form schema or validation

6. **Missing API Key Handling**
   - **Decision:** Show ERROR MESSAGE when API key missing
   - **Rationale:** User decision #6, clear user feedback
   - **Implementation:** Hook's error state will contain API key errors, display inline

7. **chatId Parameter**
   - **Decision:** Pass empty string `''` for chatId in manual creation
   - **Rationale:** Hook requires chatId parameter but it's not used in manual flow
   - **Implementation:** `generateKeyboard({ messageText: context, chatId: '' })`

### Integration Points

- **useGenerateKeyboardFromMessage Hook:** Returns `{ generateKeyboard, isGenerating, error }`
- **React Hook Form:** Uses `setValue()` for name, `fieldArray.replace()` for buttons
- **Form Validation:** Generated data fits within existing schema (24 buttons, each max 50 chars)

### Error Handling Strategy

**Generation Errors:**
- API key missing: Hook's error will contain message, display inline
- Generation failure: Show inline error with message from hook
- Invalid response: Hook throws, show generic error "Failed to generate buttons"

**Form Errors:**
- Validation errors: Existing form validation displays field errors
- Save errors: Handled by `useCreateKeyboard` hook (toast notifications)

**Pattern:** Display errors inline near Generate button, don't block manual editing fallback

---

## Interface Definitions

### Module: CustomKeyboardEditor Component

**File:** `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-editor.tsx`

**New State:**
```typescript
const [generationContext, setGenerationContext] = useState('');
```

**New Hook:**
```typescript
const { generateKeyboard, isGenerating, error: generationError } = useGenerateKeyboardFromMessage();
```

**New Handler:**
```typescript
async function handleGenerateButtons() {
  if (!generationContext.trim()) {
    return; // Button disabled when empty
  }

  try {
    const result = await generateKeyboard({
      messageText: generationContext,
      chatId: '', // Not used in manual creation
    });

    // Auto-populate name
    form.setValue('name', result.keyboardTitle);

    // Replace all buttons
    fieldArray.replace(
      result.buttons.map(text => ({
        text,
        value: '',
        image_url: '',
      }))
    );

    // Success feedback
    toast.success('Buttons generated successfully');
  } catch (err) {
    // Error already set by hook, shown in UI
    console.error('Generation failed:', err);
  }
}
```

**New UI Section (lines 188-189):**
```typescript
{/* AI Generation Section */}
<div className="space-y-2">
  <Label htmlFor="generation-context">Generate Buttons with AI</Label>

  <div className="flex gap-2">
    <Input
      id="generation-context"
      value={generationContext}
      onChange={(e) => setGenerationContext(e.target.value)}
      placeholder="Describe the conversation topic (e.g., 'medical appointments')"
      disabled={isGenerating}
    />
    <Button
      type="button"
      variant="outline"
      onClick={handleGenerateButtons}
      disabled={isGenerating || !generationContext.trim()}
    >
      {isGenerating ? 'Generating...' : 'Generate'}
    </Button>
  </div>

  {/* Error state */}
  {generationError && (
    <p className="text-sm text-red-600">
      {generationError.message}
    </p>
  )}

  <p className="text-xs text-muted-foreground">
    AI will generate 24 contextual phrase buttons and suggest a keyboard name.
  </p>
</div>
```

**Integration Algorithm:**
1. User types context → `setGenerationContext()`
2. User clicks Generate → `handleGenerateButtons()`
3. Call `generateKeyboard({ messageText, chatId: '' })`
4. On success:
   - Set name: `form.setValue('name', result.keyboardTitle)`
   - Replace buttons: `fieldArray.replace(result.buttons.map(...))`
   - Show success toast
5. On error:
   - Error displayed via `generationError` state
   - Manual editing still available

---

## Task Breakdown

### Task 1: Add AI Generation UI to CustomKeyboardEditor

**Objective:** Add context input, generate button, and error handling UI

**Files:**
- Modify: `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-editor.tsx`

**Changes:**

**After line 6:** Add new import
```typescript
import { toast } from 'sonner';
```

**After line 23:** Add hook import
```typescript
import { useGenerateKeyboardFromMessage } from '../hooks/use-generate-keyboard';
```

**After line 64:** Add new state and hook
```typescript
const [generationContext, setGenerationContext] = useState('');
const { generateKeyboard, isGenerating, error: generationError } = useGenerateKeyboardFromMessage();
```

**After line 145:** Add generation handler
```typescript
const handleGenerateButtons = async () => {
  if (!generationContext.trim()) {
    return;
  }

  try {
    const result = await generateKeyboard({
      messageText: generationContext,
      chatId: '', // Not used in manual creation
    });

    // Auto-populate keyboard name
    form.setValue('name', result.keyboardTitle);

    // Replace all buttons with generated ones
    fieldArray.replace(
      result.buttons.map(text => ({
        text,
        value: '',
        image_url: '',
      }))
    );

    toast.success('Buttons generated successfully');
  } catch (err) {
    // Error already handled by hook and displayed in UI
    console.error('Failed to generate buttons:', err);
  }
};
```

**Replace lines 188-189:** Add AI generation section
```typescript
      </div>

      {/* AI Generation Section */}
      <div className="space-y-2">
        <Label htmlFor="generation-context">Generate Buttons with AI (Optional)</Label>

        <div className="flex gap-2">
          <Input
            id="generation-context"
            value={generationContext}
            onChange={(e) => setGenerationContext(e.target.value)}
            placeholder="Describe the conversation topic (e.g., 'medical appointments')"
            disabled={isGenerating}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateButtons}
            disabled={isGenerating || !generationContext.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Error state */}
        {generationError && (
          <p className="text-sm text-red-600">
            {generationError.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          AI will generate 24 contextual phrase buttons and suggest a keyboard name based on your description.
        </p>
      </div>

      {/* Buttons Grid */}
```

**Validation:**
- Component compiles without TypeScript errors
- UI renders between "Columns" field and "Buttons" grid
- Input field is visible and editable
- Generate button shows correct disabled states

**Notes:**
- Keep section optional - manual button creation still works
- Position before "Buttons Grid" for logical flow
- Use existing Input and Button components from shadcn/ui

---

### Task 2: Wire Up fieldArray.replace() Method

**Objective:** Ensure form field array properly replaces buttons on generation

**Files:**
- Verify in: `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-editor.tsx`

**Implementation:**

The `fieldArray.replace()` method is already available from `useFieldArray` (line 104):
```typescript
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'buttons',
});
```

**Required Change:**
```typescript
const { fields, append, remove, replace } = useFieldArray({
  control: form.control,
  name: 'buttons',
});
```

**Usage in handleGenerateButtons:**
```typescript
replace(
  result.buttons.map(text => ({
    text,
    value: '', // Defaults to empty, will use text value on save
    image_url: '',
  }))
);
```

**Validation:**
- After generation, form should show exactly 24 buttons
- Existing buttons should be completely replaced (not appended)
- Grid preview should update immediately

**Notes:**
- `replace()` is a standard react-hook-form fieldArray method
- Maps AI button strings to form field objects
- Preserves form validation schema

---

### Task 3: Manual Testing & Verification

**Objective:** Verify complete feature works end-to-end

**Test Scenarios:**

**Happy Path:**
1. Open keyboard editor (click "+" tab in chat)
2. Enter context: "Planning a birthday party"
3. Click "Generate"
4. Verify:
   - Loading state shows ("Generating...")
   - After ~2-3 seconds, 24 buttons populate
   - Keyboard name auto-fills (e.g., "Birthday")
   - Columns value preserved (default 4)
   - Grid preview updates with buttons
5. Edit a few generated button texts manually
6. Submit form
7. Verify keyboard created successfully

**Error Cases:**
1. **Empty Context:**
   - Leave context input empty
   - Verify Generate button disabled
   - Enter text → button enables

2. **Generation Failure:**
   - Trigger a generation failure (e.g., network error)
   - Verify error message displays
   - Verify form remains editable
   - Verify can retry generation

3. **Replace Existing Buttons:**
   - Add 3 buttons manually
   - Enter context and generate
   - Verify manual buttons replaced (not appended)
   - Verify exactly 24 buttons shown

**Edge Cases:**
1. Generate → Edit name → Generate again → Name overwrites edits (expected)
2. Generate → Change columns → Verify grid layout updates
3. Generate → Edit buttons → Submit → Verify edits saved correctly
4. Generate with very long context (100+ chars) → Verify works or shows error

**Browser Testing:**
- Test in Chrome (primary)
- Test in Safari (WebKit)
- Test in Firefox (optional)

**Notes:**
- No automated tests required (no test infrastructure exists)
- Focus on UX flow and error states
- Verify changes don't break existing manual creation flow

---

## Implementation Notes

### Import Statements Required

**CustomKeyboardEditor:**
```typescript
import { toast } from 'sonner'; // For success notification
import { useGenerateKeyboardFromMessage } from '../hooks/use-generate-keyboard';
```

### Form Field Mapping

**AI Output → Form Field:**
```typescript
// AI returns:
{
  chatTitle: "Birthday Planning",     // Not used in manual flow
  keyboardTitle: "Birthday",          // → form.setValue('name', ...)
  buttons: ["Yes please", "No thanks", ...] // → fieldArray.replace([...])
}

// Form expects:
{
  name: string,
  columns: number,
  buttons: [
    { text: string, value: string, image_url: string }
  ]
}

// Transformation:
buttons.map(text => ({
  text,           // AI button text
  value: '',      // Empty, will default to text on save
  image_url: ''   // Empty, no images for AI-generated buttons
}))
```

### State Management

**Component State Flow:**
```
generationContext (local state)
  ↓ User types
setGenerationContext(value)
  ↓ User clicks Generate
handleGenerateButtons()
  ↓ Calls hook
generateKeyboard({ messageText, chatId })
  ↓ Updates form
form.setValue() + fieldArray.replace()
  ↓ Form re-renders
Grid preview updates with new buttons
```

### Performance Considerations

- AI generation takes 2-3 seconds (Gemini API call)
- Disable input/button during generation to prevent double-submit
- Use loading text "Generating..." for user feedback
- No caching needed (generation is cheap, context changes each time)

### Accessibility Considerations

- Label for context input: "Generate Buttons with AI (Optional)"
- Placeholder text describes expected input
- Error messages use semantic `text-red-600` color
- Button disabled states use `disabled:opacity-50`
- Help text in `text-muted-foreground` for low emphasis

---

## Integration & Validation

### Pre-Implementation Checklist
- [ ] Read and understand research document
- [ ] Verify `useGenerateKeyboardFromMessage` hook works in chat flow
- [ ] Verify `useFieldArray.replace()` method exists
- [ ] Confirm form schema accepts 24 buttons

### Post-Implementation Checklist
- [ ] Task 1: UI section added with context input and generate button
- [ ] Task 2: `fieldArray.replace()` wired up correctly
- [ ] All test scenarios pass (happy path + error cases)
- [ ] Linter passes (`pnpm run lint`)
- [ ] TypeScript compiles without errors
- [ ] Manual button creation still works without using AI
- [ ] Generated buttons can be edited manually
- [ ] Form submission creates keyboard correctly

### Success Metrics
- User can generate keyboard buttons from a simple text description
- Generated buttons replace existing ones (not append)
- Keyboard name auto-populates from AI suggestion
- Clear error message when API key missing
- Feature degrades gracefully (manual creation remains functional)

---

## Rollback Plan

If issues arise, rollback is simple:
1. Revert changes to `custom-keyboard-editor.tsx` (remove AI section)
2. Feature is fully isolated - no data model changes
3. Manual creation flow unaffected

**Risk Level:** Low - Feature is additive, doesn't modify existing behavior

---

**Plan Complete.** Ready for implementation.
