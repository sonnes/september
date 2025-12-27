import { z } from 'zod';

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

// Grid button represents a single button in custom keyboard
export interface GridButton {
  id: string;              // Unique button ID (nanoid)
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
export type CreateCustomKeyboardData = Omit<CustomKeyboard, 'id' | 'created_at' | 'updated_at' | 'buttons'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  buttons: Array<{
    text: string;
    value?: string;
    image_url?: string;
  }>;
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

// Zod Validation Schemas
export const GridButtonSchema = z.object({
  id: z.string().min(1, 'Button ID required'),
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
