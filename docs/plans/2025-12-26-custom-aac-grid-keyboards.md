# Custom AAC Grid Keyboards Implementation Plan

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-26
**Goal:** Enable users to create, save, and use custom AAC-style grid keyboards alongside existing QWERTY/Circular keyboards
**Architecture:** Local-first storage with TanStack DB (IndexedDB), reuse existing keyboard context, simple inline editor for Phase 1
**Tech Stack:** Next.js 15, React 19, TanStack DB, Zod validation, shadcn/ui, Tailwind CSS

**Success Criteria:**
- [ ] All tests pass
- [ ] Linter passes (`pnpm run lint`)
- [ ] Custom keyboards persist across sessions
- [ ] Users can create/edit/delete custom keyboards
- [ ] Custom keyboards appear in keyboard selector
- [ ] Custom keyboards work with onKeyPress callback
- [ ] No breaking changes to existing QWERTY/Circular keyboards
- [ ] README.md updated with new features

---

## Architecture Overview

### System Structure

```
packages/keyboards/
├── components/
│   ├── keyboard-context.tsx          # EXISTING - manages keyboard state
│   ├── keyboard-renderer.tsx         # MODIFY - add custom keyboard rendering
│   ├── qwerty-keyboard.tsx           # EXISTING - no changes
│   ├── circular-keyboard.tsx         # EXISTING - no changes
│   ├── custom-keyboard.tsx           # NEW - renders custom grid keyboard
│   ├── custom-keyboard-editor.tsx    # NEW - create/edit keyboards
│   └── custom-keyboard-list.tsx      # NEW - manage keyboards
├── hooks/
│   ├── use-keyboard-context.ts       # EXISTING - no changes
│   ├── use-custom-keyboards.ts       # NEW - query custom keyboards
│   ├── use-create-keyboard.ts        # NEW - create keyboard mutation
│   ├── use-update-keyboard.ts        # NEW - update keyboard mutation
│   └── use-delete-keyboard.ts        # NEW - delete keyboard mutation
├── lib/
│   └── grid-utils.ts                 # NEW - grid layout calculations
├── types/
│   └── index.ts                      # MODIFY - add custom keyboard types
├── db.ts                             # NEW - TanStack DB collections
├── index.ts                          # MODIFY - export new components/hooks
└── README.md                         # UPDATE - document new features
```

### Data Flow

1. **Read Flow**: Component → Hook (useLiveQuery) → Collection → IndexedDB → UI
2. **Write Flow**: User Action → Hook (mutation) → Collection → IndexedDB + BroadcastChannel → All tabs updated
3. **Keyboard Selection**: User clicks tab → KeyboardRenderer → CustomKeyboard → onKeyPress callback

### Key Design Decisions

1. **Local-First Storage**: Use TanStack DB with IndexedDB (same pattern as chats package)
   - **Rationale**: Offline-first, instant synchronization, consistent with existing codebase

2. **Keyboard Type as 'custom'**: Use a simple `'custom'` type for all custom keyboards
   - **Rationale**: Simple, backwards compatible, no need for UUID matching. Selected custom keyboard ID stored separately in context.

3. **Grid Layout**: Fixed responsive grid (columns based on viewport)
   - **Rationale**: Simple implementation, accessible, works on all devices

4. **Phase 1 Scope**: Basic create/edit/delete with inline form editor
   - **Rationale**: Foundation for future features (import/export, multi-page, drag-drop)

### Integration Points

- **KeyboardContext → CustomKeyboard**: Context provides selected keyboard ID, CustomKeyboard fetches and renders
- **KeyboardRenderer → KeyboardEditor**: "Add New" tab shows editor modal/dialog
- **CustomKeyboard → onKeyPress**: Same callback interface as QWERTY/Circular (string key)
- **IndexedDB → BroadcastChannel**: Multi-tab sync (same pattern as chats)

### Error Handling Strategy

**Query Hooks** (read operations):
- Return `{ data, isLoading, error?: { message: string } }`
- Display error state in UI (fallback message)
- Log to console for debugging

**Mutation Hooks** (write operations):
- Throw errors for component error boundaries
- Show toast notifications for user feedback (sonner)
- Log to console for debugging

### Testing Strategy

- **Unit**: Test grid layout calculations, validation schemas
- **Integration**: Test database operations, hook behavior
- **E2E**: Manual testing - create keyboard, use in chat, refresh browser, check persistence

---

## Interface Definitions

### Module: Custom Keyboards

**File:** `/Users/raviatluri/work/september/packages/keyboards/types/index.ts`

**Existing Types** (no changes):
```typescript
export interface ControlButton {
  key: string;
  label: string;
  width: number;
}

export interface CircleKey {
  key: string;
  startAngle: number;
  endAngle: number;
  radius: number;
}
```

**New Domain Types**:
```typescript
// Grid button represents a single button in custom keyboard
export interface GridButton {
  id: string;              // Unique button ID (UUID)
  text: string;            // Button display text (what user sees)
  value?: string;          // Optional: different value sent on press (defaults to text)
  image_url?: string;      // Optional: button icon/image
  order: number;           // Display order in grid (0-indexed)
}

// Custom keyboard definition
export interface CustomKeyboard {
  id: string;              // UUID
  user_id: string;         // Owner ID
  name: string;            // Keyboard name (e.g., "Medical Terms", "Daily Phrases")
  buttons: GridButton[];   // List of buttons
  chat_id?: string;        // Optional: assigned to specific chat
  columns: number;         // Number of columns in grid (default: 3)
  created_at: Date;
  updated_at: Date;
}

// Input type for creating keyboard (omits auto-generated fields)
export type CreateCustomKeyboardData = Omit<CustomKeyboard, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

// Input type for updating keyboard
export type UpdateCustomKeyboardData = Partial<Omit<CustomKeyboard, 'id' | 'user_id' | 'created_at'>>;

// Form data for keyboard editor
export interface CustomKeyboardFormData {
  name: string;
  chat_id?: string;
  columns: number;
  buttons: Array<{
    text: string;
    value?: string;
    image_url?: string;
  }>;
}
```

**Validation Schemas** (Zod):
```typescript
import { z } from 'zod';

export const GridButtonSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1, 'Button text is required').max(50, 'Text too long'),
  value: z.string().max(100).optional(),
  image_url: z.string().url().optional(),
  order: z.number().int().min(0),
});

export const CustomKeyboardSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  buttons: z.array(GridButtonSchema).min(1, 'At least one button required').max(50, 'Too many buttons'),
  chat_id: z.string().uuid().optional(),
  columns: z.number().int().min(2).max(6).default(3),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
```

**Extended KeyboardType**:
```typescript
// MODIFY keyboard-context.tsx
export type KeyboardType = 'qwerty' | 'circular' | 'custom' | 'none';
```

**Context Storage Update**:
```typescript
// MODIFY keyboard-context.tsx - add to context
export interface KeyboardContextType {
  isVisible: boolean;
  toggleVisibility: () => void;
  showKeyboard: () => void;
  hideKeyboard: () => void;
  keyboardType: KeyboardType;
  setKeyboardType: (type: KeyboardType) => void;
  customKeyboardId?: string;  // NEW: ID of selected custom keyboard
  setCustomKeyboardId: (id?: string) => void;  // NEW
}
```

**Rationale**:
- Follows existing patterns (Chat/Message structure)
- Simple grid model (buttons + order + columns)
- Extensible for future features (images, multi-page)
- Zod validation ensures data integrity
- Clean separation: `keyboardType: 'custom'` + `customKeyboardId` tells us which custom keyboard

---

## Database Specification

### File: `/Users/raviatluri/work/september/packages/keyboards/db.ts`

**Pattern**: Follow chats package exactly (`packages/chats/db.ts`)

**Collections**:
```typescript
import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptions } from '@/lib/indexeddb/collection';
import { CustomKeyboard, CustomKeyboardSchema } from './types';

export const customKeyboardCollection = createCollection(
  indexedDBCollectionOptions<CustomKeyboard>({
    schema: CustomKeyboardSchema,
    id: 'custom-keyboards',
    kvStoreOptions: {
      dbName: 'app-custom-keyboards',
    },
    channelName: 'app-custom-keyboards',
    getKey: item => item.id,
  })
);
```

**Database Name**: `app-custom-keyboards`
**Channel Name**: `app-custom-keyboards` (for multi-tab sync)
**Key**: `keyboard.id` (UUID)

**IndexedDB Schema** (handled by TanStack DB):
- Object Store: `custom-keyboards`
- Key Path: `id`
- Indexes: None initially (can add later for chat_id lookup)

**Validation**: Zod schema validates before insert/update

---

## Hook Specifications

### Hook: useCustomKeyboards (Query)

**File:** `/Users/raviatluri/work/september/packages/keyboards/hooks/use-custom-keyboards.ts`

**Interface**:
```typescript
export interface UseCustomKeyboardsReturn {
  keyboards: CustomKeyboard[];
  isLoading: boolean;
  error?: { message: string };
}

export function useCustomKeyboards(params?: {
  chatId?: string;
}): UseCustomKeyboardsReturn
```

**Implementation Pattern** (based on `use-messages.ts`):
```typescript
import { useMemo } from 'react';
import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { customKeyboardCollection } from '../db';
import { CustomKeyboard } from '../types';

export function useCustomKeyboards({ chatId }: { chatId?: string } = {}) {
  const {
    data: keyboards,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: customKeyboardCollection });
      if (chatId) {
        query = query.where(({ items }) => eq(items.chat_id, chatId));
      }
      return query.orderBy(({ items }) => items.name, 'asc');
    },
    [chatId]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    keyboards: (keyboards || []) as CustomKeyboard[],
    isLoading,
    error,
  };
}
```

**Behavior**:
- Returns all keyboards if no chatId
- Filters by chatId if provided
- Sorted alphabetically by name
- Reactive: updates when DB changes

---

### Hook: useCustomKeyboard (Single Query)

**File:** `/Users/raviatluri/work/september/packages/keyboards/hooks/use-custom-keyboard.ts`

**Interface**:
```typescript
export interface UseCustomKeyboardReturn {
  keyboard: CustomKeyboard | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useCustomKeyboard(id?: string): UseCustomKeyboardReturn
```

**Implementation Pattern** (based on `use-db-account.ts`):
```typescript
import { useMemo } from 'react';
import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { customKeyboardCollection } from '../db';
import { CustomKeyboard } from '../types';

export function useCustomKeyboard(id?: string): UseCustomKeyboardReturn {
  const {
    data: keyboard,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      if (!id) return q.from({ items: customKeyboardCollection }).limit(0);
      return q.from({ items: customKeyboardCollection })
        .where(({ items }) => eq(items.id, id));
    },
    [id]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    keyboard: keyboard?.[0] as CustomKeyboard | undefined,
    isLoading,
    error,
  };
}
```

---

### Hook: useCreateKeyboard (Mutation)

**File:** `/Users/raviatluri/work/september/packages/keyboards/hooks/use-create-keyboard.ts`

**Interface**:
```typescript
export interface UseCreateKeyboardReturn {
  createKeyboard: (data: CreateCustomKeyboardData) => Promise<CustomKeyboard>;
  isCreating: boolean;
}

export function useCreateKeyboard(): UseCreateKeyboardReturn
```

**Implementation Pattern** (based on `use-create-message.ts`):
```typescript
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useAccountContext } from '@/packages/account';
import { customKeyboardCollection } from '../db';
import { CreateCustomKeyboardData, CustomKeyboard } from '../types';

export function useCreateKeyboard(): UseCreateKeyboardReturn {
  const { user } = useAccountContext();
  const [isCreating, setIsCreating] = useState(false);

  const createKeyboard = useCallback(
    async (data: CreateCustomKeyboardData) => {
      setIsCreating(true);
      try {
        const now = new Date();
        const keyboardId = data.id || uuidv4();

        // Assign order to buttons if not present
        const buttons = data.buttons.map((btn, index) => ({
          id: uuidv4(),
          text: btn.text,
          value: btn.value,
          image_url: btn.image_url,
          order: index,
        }));

        const newKeyboard: CustomKeyboard = {
          id: keyboardId,
          user_id: data.user_id || user?.id || '',
          name: data.name,
          buttons,
          chat_id: data.chat_id,
          columns: data.columns || 3,
          created_at: data.created_at || now,
          updated_at: now,
        };

        await customKeyboardCollection.insert(newKeyboard);
        toast.success('Keyboard created');
        return newKeyboard;
      } catch (err) {
        console.error('Failed to create keyboard:', err);
        toast.error('Failed to create keyboard');
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [user]
  );

  return { createKeyboard, isCreating };
}
```

**Validation**: Zod schema validates on insert

---

### Hook: useUpdateKeyboard (Mutation)

**File:** `/Users/raviatluri/work/september/packages/keyboards/hooks/use-update-keyboard.ts`

**Interface**:
```typescript
export interface UseUpdateKeyboardReturn {
  updateKeyboard: (id: string, updates: UpdateCustomKeyboardData) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateKeyboard(): UseUpdateKeyboardReturn
```

**Implementation**:
```typescript
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { customKeyboardCollection } from '../db';
import { UpdateCustomKeyboardData } from '../types';

export function useUpdateKeyboard(): UseUpdateKeyboardReturn {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateKeyboard = useCallback(
    async (id: string, updates: UpdateCustomKeyboardData) => {
      setIsUpdating(true);
      try {
        await customKeyboardCollection.update(id, draft => {
          Object.assign(draft, {
            ...updates,
            updated_at: new Date(),
          });
        });
        toast.success('Keyboard updated');
      } catch (err) {
        console.error('Failed to update keyboard:', err);
        toast.error('Failed to update keyboard');
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { updateKeyboard, isUpdating };
}
```

---

### Hook: useDeleteKeyboard (Mutation)

**File:** `/Users/raviatluri/work/september/packages/keyboards/hooks/use-delete-keyboard.ts`

**Interface**:
```typescript
export interface UseDeleteKeyboardReturn {
  deleteKeyboard: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteKeyboard(): UseDeleteKeyboardReturn
```

**Implementation**:
```typescript
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { customKeyboardCollection } from '../db';

export function useDeleteKeyboard(): UseDeleteKeyboardReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteKeyboard = useCallback(
    async (id: string) => {
      setIsDeleting(true);
      try {
        await customKeyboardCollection.delete(id);
        toast.success('Keyboard deleted');
      } catch (err) {
        console.error('Failed to delete keyboard:', err);
        toast.error('Failed to delete keyboard');
        throw err;
      } finally {
        setIsDeleting(false);
      }
    },
    []
  );

  return { deleteKeyboard, isDeleting };
}
```

---

## Component Specifications

### Component: CustomKeyboard

**File:** `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard.tsx`

**Purpose**: Render a custom grid keyboard from database

**Props**:
```typescript
interface CustomKeyboardProps {
  keyboardId: string;
  className?: string;
  onKeyPress: (key: string) => void;
}
```

**Structure**:
```typescript
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { calculateGridColumns } from '../lib/grid-utils';

export function CustomKeyboard({ 
  keyboardId, 
  className = '', 
  onKeyPress 
}: CustomKeyboardProps) {
  const { keyboard, isLoading, error } = useCustomKeyboard(keyboardId);

  if (isLoading) {
    return <div className={cn('p-4 text-center', className)}>Loading keyboard...</div>;
  }

  if (error || !keyboard) {
    return <div className={cn('p-4 text-center text-red-600', className)}>
      {error?.message || 'Keyboard not found'}
    </div>;
  }

  // Sort buttons by order
  const sortedButtons = [...keyboard.buttons].sort((a, b) => a.order - b.order);

  // Responsive columns (use keyboard.columns setting)
  const gridClass = cn(
    'grid gap-2 p-4',
    `grid-cols-${Math.min(keyboard.columns, 3)}`,  // Mobile: max 3 cols
    `md:grid-cols-${keyboard.columns}`              // Desktop: user setting
  );

  const handleButtonClick = (button: GridButton) => {
    const value = button.value || button.text;
    onKeyPress(value);
  };

  return (
    <div className={cn('bg-white border-t border-zinc-200', className)}>
      <div className="max-w-4xl mx-auto">
        {/* Keyboard title */}
        <div className="px-4 pt-2 text-sm text-muted-foreground">
          {keyboard.name}
        </div>
        
        {/* Grid buttons */}
        <div className={gridClass}>
          {sortedButtons.map(button => (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button)}
              className={cn(
                'min-h-16 p-2',
                'flex flex-col items-center justify-center',
                'bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300',
                'border border-zinc-300 rounded-md',
                'text-sm font-medium text-zinc-800',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'select-none'
              )}
              type="button"
            >
              {button.image_url && (
                <img 
                  src={button.image_url} 
                  alt={button.text}
                  className="w-8 h-8 mb-1 object-contain"
                />
              )}
              <span className="text-center break-words">{button.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Key Points**:
- Responsive grid (Tailwind)
- Sorted by button.order
- Supports optional images
- Same styling as QWERTY keyboard
- onKeyPress sends button.value or button.text

---

### Component: CustomKeyboardEditor

**File:** `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-editor.tsx`

**Purpose**: Create/edit custom keyboards (inline form, Phase 1)

**Props**:
```typescript
interface CustomKeyboardEditorProps {
  keyboardId?: string;      // If editing existing
  chatId?: string;          // If creating for specific chat
  onSave?: (keyboard: CustomKeyboard) => void;
  onCancel?: () => void;
}
```

**Form Fields**:
1. Keyboard Name (text input, required)
2. Columns (number select: 2-6, default 3)
3. Buttons (dynamic list):
   - Text (required)
   - Value (optional, defaults to text)
   - Image URL (optional)
   - Add/Remove buttons
4. Assign to Chat (optional select)

**Structure** (using react-hook-form + Zod):
```typescript
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAccountContext } from '@/packages/account';
import { useChats } from '@/packages/chats';
import { useCreateKeyboard } from '../hooks/use-create-keyboard';
import { useUpdateKeyboard } from '../hooks/use-update-keyboard';
import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { CustomKeyboardFormData } from '../types';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, 'Name required').max(50),
  columns: z.number().int().min(2).max(6),
  chat_id: z.string().optional(),
  buttons: z.array(
    z.object({
      text: z.string().min(1, 'Text required').max(50),
      value: z.string().max(100).optional(),
      image_url: z.string().url().optional().or(z.literal('')),
    })
  ).min(1, 'At least one button required').max(50),
});

export function CustomKeyboardEditor({ 
  keyboardId, 
  chatId, 
  onSave, 
  onCancel 
}: CustomKeyboardEditorProps) {
  const { user } = useAccountContext();
  const { chats } = useChats();
  const { keyboard, isLoading: isLoadingKeyboard } = useCustomKeyboard(keyboardId);
  const { createKeyboard, isCreating } = useCreateKeyboard();
  const { updateKeyboard, isUpdating } = useUpdateKeyboard();

  const isEditing = !!keyboardId;

  // Initialize form
  const form = useForm<CustomKeyboardFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: keyboard || {
      name: '',
      columns: 3,
      chat_id: chatId,
      buttons: [{ text: '', value: '', image_url: '' }],
    },
  });

  // Dynamic button fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'buttons',
  });

  const handleSubmit = async (data: CustomKeyboardFormData) => {
    try {
      if (isEditing && keyboardId) {
        await updateKeyboard(keyboardId, data);
        onSave?.(/* refetch keyboard */);
      } else {
        const newKeyboard = await createKeyboard({
          ...data,
          user_id: user?.id || '',
        });
        onSave?.(newKeyboard);
      }
    } catch (err) {
      // Error handled by hooks (toast)
    }
  };

  if (isLoadingKeyboard) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4">
      {/* Keyboard Name */}
      <div>
        <Label htmlFor="name">Keyboard Name</Label>
        <Input
          id="name"
          {...form.register('name')}
          placeholder="e.g., Medical Terms"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Columns */}
      <div>
        <Label htmlFor="columns">Columns</Label>
        <Select
          value={form.watch('columns').toString()}
          onValueChange={val => form.setValue('columns', parseInt(val))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6].map(num => (
              <SelectItem key={num} value={num.toString()}>
                {num} columns
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assign to Chat */}
      <div>
        <Label htmlFor="chat_id">Assign to Chat (optional)</Label>
        <Select
          value={form.watch('chat_id') || ''}
          onValueChange={val => form.setValue('chat_id', val || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {chats.map(chat => (
              <SelectItem key={chat.id} value={chat.id}>
                {chat.title || 'Untitled Chat'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buttons */}
      <div>
        <Label>Buttons</Label>
        <div className="space-y-2 mt-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start p-2 border rounded">
              <div className="flex-1 space-y-2">
                <Input
                  {...form.register(`buttons.${index}.text`)}
                  placeholder="Button text"
                />
                <Input
                  {...form.register(`buttons.${index}.value`)}
                  placeholder="Value (optional, defaults to text)"
                />
                <Input
                  {...form.register(`buttons.${index}.image_url`)}
                  placeholder="Image URL (optional)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ text: '', value: '', image_url: '' })}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Button
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isCreating || isUpdating}>
          {isCreating || isUpdating ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
```

**Validation**: Zod schema via react-hook-form

---

### Component: CustomKeyboardList

**File:** `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-list.tsx`

**Purpose**: Manage (view/edit/delete) custom keyboards

**Props**:
```typescript
interface CustomKeyboardListProps {
  onEdit?: (keyboardId: string) => void;
  onSelect?: (keyboardId: string) => void;
}
```

**Structure**:
```typescript
'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomKeyboards } from '../hooks/use-custom-keyboards';
import { useDeleteKeyboard } from '../hooks/use-delete-keyboard';

export function CustomKeyboardList({ onEdit, onSelect }: CustomKeyboardListProps) {
  const { keyboards, isLoading, error } = useCustomKeyboards();
  const { deleteKeyboard, isDeleting } = useDeleteKeyboard();

  const handleDelete = async (id: string) => {
    if (confirm('Delete this keyboard?')) {
      await deleteKeyboard(id);
    }
  };

  if (isLoading) return <div className="p-4">Loading keyboards...</div>;
  if (error) return <div className="p-4 text-red-600">{error.message}</div>;
  if (keyboards.length === 0) {
    return <div className="p-4 text-muted-foreground">No custom keyboards yet.</div>;
  }

  return (
    <div className="space-y-2 p-4">
      {keyboards.map(keyboard => (
        <div key={keyboard.id} className="flex items-center gap-2 p-2 border rounded">
          <button
            onClick={() => onSelect?.(keyboard.id)}
            className="flex-1 text-left"
          >
            <div className="font-medium">{keyboard.name}</div>
            <div className="text-sm text-muted-foreground">
              {keyboard.buttons.length} buttons
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit?.(keyboard.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(keyboard.id)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

## Integration Tasks

### Task 1: Define Types and Schemas

**Objective:** Create TypeScript interfaces and Zod validation schemas

**Files:**
- Modify: `/Users/raviatluri/work/september/packages/keyboards/types/index.ts`

**Implementation:**
1. Add all type definitions from Interface Definitions section
2. Add Zod schemas for validation
3. Export all types

**Validation:**
- File compiles with no TypeScript errors
- Run: `pnpm run build`

---

### Task 2: Create Database Collection

**Objective:** Set up TanStack DB collection for custom keyboards

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/db.ts`

**Implementation:**
1. Import dependencies (createCollection, indexedDBCollectionOptions)
2. Create customKeyboardCollection with schema
3. Export collection

**Validation:**
- File compiles with no errors
- Pattern matches `/Users/raviatluri/work/september/packages/chats/db.ts` exactly

---

### Task 3: Create Query Hooks

**Objective:** Implement data-fetching hooks

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/hooks/use-custom-keyboards.ts`
- Create: `/Users/raviatluri/work/september/packages/keyboards/hooks/use-custom-keyboard.ts`

**Implementation:**
1. Implement useCustomKeyboards (list, optional filter by chatId)
2. Implement useCustomKeyboard (single keyboard by ID)
3. Follow return type pattern: `{ data, isLoading, error?: { message: string } }`

**Test Scenario:**
```
Suite: useCustomKeyboards

  Test: returns empty array when no keyboards
    Arrange: Empty database
    Act: const { keyboards } = useCustomKeyboards()
    Assert: keyboards === []

  Test: returns all keyboards sorted by name
    Arrange: Insert 3 keyboards (names: C, A, B)
    Act: const { keyboards } = useCustomKeyboards()
    Assert: keyboards.map(k => k.name) === ['A', 'B', 'C']

  Test: filters by chatId
    Arrange: 2 keyboards (one with chat_id='chat-1', one without)
    Act: const { keyboards } = useCustomKeyboards({ chatId: 'chat-1' })
    Assert: keyboards.length === 1

Suite: useCustomKeyboard

  Test: returns keyboard by ID
    Arrange: Insert keyboard with ID='kb-1'
    Act: const { keyboard } = useCustomKeyboard('kb-1')
    Assert: keyboard?.id === 'kb-1'

  Test: returns undefined for non-existent ID
    Arrange: Empty database
    Act: const { keyboard } = useCustomKeyboard('invalid')
    Assert: keyboard === undefined
```

**Validation:**
- Hooks compile without errors
- Can import and use in test component

---

### Task 4: Create Mutation Hooks

**Objective:** Implement create/update/delete hooks

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/hooks/use-create-keyboard.ts`
- Create: `/Users/raviatluri/work/september/packages/keyboards/hooks/use-update-keyboard.ts`
- Create: `/Users/raviatluri/work/september/packages/keyboards/hooks/use-delete-keyboard.ts`

**Implementation:**
1. Implement useCreateKeyboard (generates UUIDs, assigns order to buttons)
2. Implement useUpdateKeyboard (updates updated_at timestamp)
3. Implement useDeleteKeyboard
4. All mutations: toast notifications, error handling, loading states

**Test Scenarios:**
```
Suite: useCreateKeyboard

  Test: creates keyboard with auto-generated ID
    Arrange: Form data without ID
    Act: await createKeyboard(data)
    Assert: 
      - New keyboard has UUID
      - Buttons have UUIDs and order (0, 1, 2...)
      - created_at and updated_at are set
      - Toast shows success

  Test: throws error on invalid data
    Arrange: Invalid data (empty name)
    Act: await createKeyboard(invalidData)
    Assert: 
      - Throws error
      - Toast shows error
      - Database unchanged

Suite: useUpdateKeyboard

  Test: updates keyboard fields
    Arrange: Existing keyboard
    Act: await updateKeyboard(id, { name: 'New Name' })
    Assert:
      - Keyboard name updated
      - updated_at timestamp changed
      - Toast shows success

Suite: useDeleteKeyboard

  Test: deletes keyboard
    Arrange: Existing keyboard
    Act: await deleteKeyboard(id)
    Assert:
      - Keyboard removed from DB
      - Toast shows success
```

**Validation:**
- All hooks compile
- Error handling works (try/catch, toast)
- Loading states toggle correctly

---

### Task 5: Create Grid Utilities

**Objective:** Helper functions for grid layout

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/lib/grid-utils.ts`

**Implementation:**
```typescript
/**
 * Calculate responsive grid columns based on viewport width
 * @param columns - User-defined columns (2-6)
 * @param isMobile - Is mobile viewport
 * @returns Tailwind grid class
 */
export function calculateGridColumns(columns: number, isMobile: boolean): string {
  const maxMobileColumns = 3;
  const effectiveColumns = isMobile ? Math.min(columns, maxMobileColumns) : columns;
  return `grid-cols-${effectiveColumns}`;
}

/**
 * Sort buttons by order field
 */
export function sortButtons<T extends { order: number }>(buttons: T[]): T[] {
  return [...buttons].sort((a, b) => a.order - b.order);
}
```

**Note**: Tailwind grid classes must be listed in full (not dynamic) to be included in build.
For dynamic columns, use inline styles or `safelist` in tailwind.config.

**Alternative** (using inline styles for true dynamic columns):
```typescript
export function getGridStyle(columns: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: '0.5rem',
  };
}
```

**Validation:**
- Functions compile
- Used in CustomKeyboard component

---

### Task 6: Create CustomKeyboard Component

**Objective:** Render custom keyboard from database

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard.tsx`

**Implementation:**
- Follow specification from Component Specifications section
- Use useCustomKeyboard hook
- Render grid with sorted buttons
- Call onKeyPress with button value

**Manual Test:**
1. Create test keyboard in DB (use browser console + collection.insert)
2. Render CustomKeyboard with test ID
3. Verify: buttons display, clicking calls onKeyPress, grid responsive

**Validation:**
- Component renders without errors
- Buttons clickable and call onKeyPress
- Error states display correctly

---

### Task 7: Create CustomKeyboardEditor Component

**Objective:** Form to create/edit keyboards

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-editor.tsx`

**Implementation:**
- Follow specification from Component Specifications section
- Use react-hook-form with zodResolver
- Dynamic button fields with useFieldArray
- Chat selection dropdown (optional)
- Save calls create or update hook

**Manual Test:**
1. Render editor in isolation
2. Fill form, add/remove buttons
3. Submit and verify keyboard created in DB
4. Edit existing keyboard and verify updates

**Validation:**
- Form validation works (required fields, max lengths)
- Adding/removing buttons works
- Create and update operations succeed
- Toasts appear on success/error

---

### Task 8: Create CustomKeyboardList Component

**Objective:** Manage existing keyboards

**Files:**
- Create: `/Users/raviatluri/work/september/packages/keyboards/components/custom-keyboard-list.tsx`

**Implementation:**
- Follow specification from Component Specifications section
- Display all keyboards with edit/delete buttons
- Delete requires confirmation
- Empty state message

**Manual Test:**
1. Create 2-3 test keyboards
2. Render list
3. Click edit (triggers onEdit callback)
4. Click delete (confirms and deletes)

**Validation:**
- List displays all keyboards
- Edit and delete actions work
- Empty state shows when no keyboards

---

### Task 9: Integrate with KeyboardRenderer

**Objective:** Add custom keyboards to keyboard selector

**Files:**
- Modify: `/Users/raviatluri/work/september/packages/keyboards/components/keyboard-renderer.tsx`

**Changes:**

1. Import hooks and components:
```typescript
import { useCustomKeyboards } from '@/packages/keyboards/hooks/use-custom-keyboards';
import { CustomKeyboard } from '@/packages/keyboards/components/custom-keyboard';
import { CustomKeyboardEditor } from '@/packages/keyboards/components/custom-keyboard-editor';
```

2. Fetch custom keyboards:
```typescript
const { keyboards: customKeyboards } = useCustomKeyboards();
```

3. Create keyboard tabs structure (hardcoded + custom):
```typescript
const tabs = [
  { value: 'qwerty', label: 'QWERTY' },
  { value: 'circular', label: 'Circular' },
  // Custom keyboard tabs
  ...customKeyboards.map(kb => ({ value: `custom-${kb.id}`, label: kb.name })),
  { value: 'add-new', label: '+' },
];
```

4. Track both keyboardType and customKeyboardId:
```typescript
const { keyboardType, setKeyboardType, customKeyboardId, setCustomKeyboardId } = useKeyboardContext();

const handleTabChange = (tabValue: string) => {
  if (tabValue === 'add-new') {
    // Show editor modal
    setShowEditor(true);
  } else if (tabValue.startsWith('custom-')) {
    const id = tabValue.slice(7); // Remove 'custom-' prefix
    setKeyboardType('custom');
    setCustomKeyboardId(id);
  } else {
    // Hardcoded keyboard (qwerty, circular)
    setKeyboardType(tabValue as KeyboardType);
    setCustomKeyboardId(undefined);
  }
};
```

5. Update renderKeyboard to handle custom keyboards:
```typescript
const renderKeyboard = () => {
  if (keyboardType === 'custom' && customKeyboardId) {
    return (
      <CustomKeyboard
        keyboardId={customKeyboardId}
        className={className}
        onKeyPress={onKeyPress}
      />
    );
  }

  // Hardcoded keyboards
  switch (keyboardType) {
    case 'qwerty':
      return <QwertyKeyboard className={className} onKeyPress={onKeyPress} />;
    case 'circular':
      return <CircularKeyboard className={className} onKeyPress={onKeyPress} />;
    case 'none':
      return null;
    default:
      return null;
  }
};
```

6. Update TabsList:
```typescript
<TabsList>
  {tabs.map(tab => (
    <TabsTrigger key={tab.value} value={tab.value}>
      {tab.label}
    </TabsTrigger>
  ))}
</TabsList>
```

**Validation:**
- Custom keyboards appear in tabs with correct names
- Selecting custom keyboard tab sets `keyboardType: 'custom'` + `customKeyboardId`
- Hardcoded keyboard tabs work correctly
- "Add New" tab shows editor
- Creating keyboard adds new tab and switches to it

---

### Task 10: Update Exports

**Objective:** Export new components and hooks

**Files:**
- Modify: `/Users/raviatluri/work/september/packages/keyboards/index.ts`

**Changes:**
```typescript
// Existing exports (no changes)
export { KeyboardProvider } from './components/keyboard-context';
export { KeyboardRenderer } from './components/keyboard-renderer';
export { QwertyKeyboard } from './components/qwerty-keyboard';
export { CircularKeyboard } from './components/circular-keyboard';
export { KeyboardToggleButton } from './components/keyboard-toggle-button';

export { useKeyboardContext } from './hooks/use-keyboard-context';
export { useShiftState } from './hooks/use-shift-state';
export { useStageSize } from './hooks/use-stage-size';
export { useKeyboardInteractions } from './hooks/use-keyboard-interactions';

// NEW exports
export { CustomKeyboard } from './components/custom-keyboard';
export { CustomKeyboardEditor } from './components/custom-keyboard-editor';
export { CustomKeyboardList } from './components/custom-keyboard-list';

export { useCustomKeyboards } from './hooks/use-custom-keyboards';
export { useCustomKeyboard } from './hooks/use-custom-keyboard';
export { useCreateKeyboard } from './hooks/use-create-keyboard';
export { useUpdateKeyboard } from './hooks/use-update-keyboard';
export { useDeleteKeyboard } from './hooks/use-delete-keyboard';

export { customKeyboardCollection } from './db';

export type {
  CustomKeyboard,
  GridButton,
  CreateCustomKeyboardData,
  UpdateCustomKeyboardData,
  CustomKeyboardFormData,
} from './types';
```

**Validation:**
- File compiles
- Can import from `@/packages/keyboards` in other files

---

### Task 11: Update README

**Objective:** Document new features

**Files:**
- Modify: `/Users/raviatluri/work/september/packages/keyboards/README.md`

**Add Sections:**

```markdown
## Features

- **QWERTY Keyboard**: A traditional keyboard layout.
- **Circular Keyboard**: A specialized keyboard layout for eye-tracking or alternative input.
- **Custom Grid Keyboards**: User-created AAC-style grid keyboards with custom buttons.
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
```

**Validation:**
- README is clear and accurate
- Code examples work when tested

---

## Testing & Validation

### Manual Testing Checklist

**Test 1: Create Custom Keyboard**
- [ ] Open keyboard renderer
- [ ] Click "+" tab (Add New)
- [ ] Fill form: name, columns, add 3-5 buttons
- [ ] Click "Create"
- [ ] Verify: keyboard appears in tabs
- [ ] Verify: toast shows success

**Test 2: Use Custom Keyboard**
- [ ] Select custom keyboard from tabs
- [ ] Click each button
- [ ] Verify: onKeyPress called with correct value
- [ ] Verify: buttons display in grid
- [ ] Verify: responsive (test mobile viewport)

**Test 3: Edit Custom Keyboard**
- [ ] Create a keyboard management page (or use browser dev tools)
- [ ] Render CustomKeyboardList
- [ ] Click edit on a keyboard
- [ ] Modify name and buttons
- [ ] Save
- [ ] Verify: changes persist (refresh page)

**Test 4: Delete Custom Keyboard**
- [ ] Render CustomKeyboardList
- [ ] Click delete on a keyboard
- [ ] Confirm deletion
- [ ] Verify: keyboard removed from list
- [ ] Verify: keyboard removed from tabs
- [ ] Verify: toast shows success

**Test 5: Multi-Tab Sync**
- [ ] Open app in two browser tabs
- [ ] In tab 1: create a keyboard
- [ ] In tab 2: verify keyboard appears immediately
- [ ] In tab 1: delete a keyboard
- [ ] In tab 2: verify keyboard disappears immediately

**Test 6: Persistence**
- [ ] Create 2-3 custom keyboards
- [ ] Close browser completely
- [ ] Reopen browser, navigate to app
- [ ] Verify: custom keyboards still exist
- [ ] Verify: can select and use them

**Test 7: Validation**
- [ ] Try creating keyboard with empty name → error
- [ ] Try creating keyboard with no buttons → error
- [ ] Try creating keyboard with button text > 50 chars → error
- [ ] Try creating keyboard with invalid image URL → error

**Test 8: Backwards Compatibility**
- [ ] Verify QWERTY keyboard still works
- [ ] Verify Circular keyboard still works
- [ ] Verify keyboard visibility toggle works
- [ ] Verify existing chats work with keyboards

**Test 9: Error Handling**
- [ ] Force database error (close IndexedDB connection)
- [ ] Verify: error message displays
- [ ] Verify: toast shows error on failed operations

---

### Lint and Build

```bash
cd /Users/raviatluri/work/september
pnpm run lint
pnpm run build
```

**Expected:**
- No lint errors
- Build succeeds
- No TypeScript errors

---

## Rollback

If implementation fails:
```bash
cd /Users/raviatluri/work/september
git reset --hard origin/main
```

---

## Future Enhancements (Out of Scope for Phase 1)

**Phase 2 - Advanced Editor:**
- Drag-and-drop button reordering
- Button icon library (built-in images)
- Multi-page keyboards (tabs within keyboard)
- Button styling (colors, sizes)

**Phase 3 - Import/Export:**
- Export keyboard to JSON
- Import keyboard from file
- Share keyboards between users (Supabase sync)

**Phase 4 - Smart Features:**
- Auto-suggest buttons based on chat context
- Frequently used buttons (analytics)
- Button categories/folders

**Phase 5 - Advanced Layout:**
- Custom button sizes (span multiple grid cells)
- Nested grids (folders/categories)
- Different layouts per keyboard (grid vs list)

---

## Notes for Implementer

**DRY (Don't Repeat Yourself):**
- The custom keyboard hooks follow the exact same pattern as chats hooks
- If you find yourself copying code from one hook to another, consider extracting shared logic
- However, don't over-abstract - 3-5 similar hooks are fine

**YAGNI (You Aren't Gonna Need It):**
- Don't implement drag-and-drop reordering yet (Phase 2)
- Don't implement import/export yet (Phase 3)
- Don't add button styling controls yet (Phase 2)
- Keep the editor simple: just form fields and add/remove buttons

**Common Pitfalls:**
- **Tailwind Dynamic Classes**: Tailwind won't include `grid-cols-${variable}` unless safelisted. Use inline styles for dynamic columns or safelist all possible values.
- **Keyboard Type Matching**: When checking `keyboardType === 'custom'`, always use the paired `customKeyboardId` to determine which custom keyboard. Never match on keyboard ID in keyboardType.
- **Button Order**: Always sort buttons by `order` field before rendering. Don't rely on database order.
- **User ID**: Always get user_id from AccountContext. Don't hardcode or leave empty.
- **UUID Generation**: Always use `uuidv4()` from 'uuid' package. Don't use Math.random().
- **BroadcastChannel**: Don't forget to test multi-tab sync - it's a key feature.
- **Error Boundaries**: Mutation hooks throw errors. Make sure parent components have error boundaries or handle errors locally.

**Testing Tips:**
- Use browser dev tools to inspect IndexedDB (Application tab → IndexedDB → app-custom-keyboards)
- Use browser console to manually insert test data: `customKeyboardCollection.insert({ ... })`
- Test on both desktop and mobile viewports
- Test with very long button text (should truncate or wrap)
- Test with many buttons (50 is max)

**Code Style:**
- Use Noto Sans font (already in global styles)
- Follow existing component patterns (QwertyKeyboard, CircularKeyboard)
- Use shadcn/ui components (Button, Input, Label, Select, etc.)
- Use Tailwind utility classes (no custom CSS unless necessary)
- Use `cn()` from `@/lib/utils` to merge class names

**Git Workflow:**
- Create feature branch: `git checkout -b feature/custom-keyboards`
- Commit after each task: `git commit -m "feat: add custom keyboard types"`
- Push before final validation: `git push origin feature/custom-keyboards`
- After all tests pass: create PR to main

---

## References

- Research: Keyboard system research document (provided by user)
- Pattern Reference: `/Users/raviatluri/work/september/packages/chats/` (TanStack DB usage)
- Pattern Reference: `/Users/raviatluri/work/september/packages/account/hooks/use-db-account.ts` (hook patterns)
- UI Reference: `/Users/raviatluri/work/september/components/ui/` (shadcn/ui components)
- Existing Keyboards: `/Users/raviatluri/work/september/packages/keyboards/components/qwerty-keyboard.tsx`
- Existing Context: `/Users/raviatluri/work/september/packages/keyboards/components/keyboard-context.tsx`

---

## Summary

This plan provides a foundation for custom AAC grid keyboards:

1. **Local-first storage** with TanStack DB (same as chats)
2. **Simple inline editor** for create/edit (Phase 1)
3. **Seamless integration** with existing keyboard system (no breaking changes)
4. **Persistent and synchronized** (IndexedDB + BroadcastChannel)

After implementation, users will be able to:
- Create custom grid keyboards with any buttons they need
- Switch between QWERTY, Circular, and custom keyboards
- Edit and delete custom keyboards
- Assign keyboards to specific chats (optional)
- Have keyboards persist across sessions and sync across tabs

The architecture is extensible for future phases (import/export, advanced editing, smart features) without requiring refactoring.
