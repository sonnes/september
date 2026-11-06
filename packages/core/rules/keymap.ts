/**
 * The keyboard shortcuts of the apps. A screen reads the label it shows and
 * the `aria-keyshortcuts` value from the same binding that it handles.
 */

export interface Binding {
  /** The `key` of the event, in lower case. */
  key: string;
  /** The Command key. With `orControl`, Control works too. */
  meta: boolean;
  orControl?: boolean;
  /** The Shift key. `undefined` accepts either, for a key that needs Shift to type. */
  shift?: boolean;
}

export const KEYMAP = {
  spaces: { key: "k", meta: true, shift: false },
  phrases: { key: "p", meta: true, shift: false },
  voice: { key: "v", meta: true, shift: true },
  output: { key: "o", meta: true, shift: true },
  clear: { key: "backspace", meta: true, shift: false },
  // Most layouts need Shift to type "?", so the binding accepts either.
  help: { key: "?", meta: true },
  tools: { key: "j", meta: true, orControl: true, shift: false },
} as const satisfies Record<string, Binding>;

export type Shortcut = keyof typeof KEYMAP;

interface KeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** Whether an event presses the binding. */
export function presses(event: KeyEvent, binding: Binding): boolean {
  if (event.key.toLowerCase() !== binding.key || event.altKey) return false;
  if (binding.shift !== undefined && event.shiftKey !== binding.shift) return false;
  if (event.metaKey && !event.ctrlKey) return binding.meta;
  if (event.ctrlKey && !event.metaKey) return binding.orControl === true;
  return false;
}

const GLYPHS: Record<string, string> = { backspace: "⌫" };
const NAMES: Record<string, string> = { backspace: "Backspace" };

const keyText = (binding: Binding, names: Record<string, string>) =>
  names[binding.key] ?? binding.key.toUpperCase();

/** The keys as a screen shows them, such as ⌘⇧V. */
export function keyLabel(binding: Binding): string {
  return `⌘${binding.shift ? "⇧" : ""}${keyText(binding, GLYPHS)}`;
}

/** The keys for `aria-keyshortcuts`, such as Meta+Shift+V. */
export function ariaShortcut(binding: Binding): string {
  const key = keyText(binding, NAMES);
  const shift = binding.shift ? "Shift+" : "";
  const meta = `Meta+${shift}${key}`;
  return binding.orControl ? `${meta} Control+${shift}${key}` : meta;
}
