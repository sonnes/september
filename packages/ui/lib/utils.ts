import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The radius, spacing, and type roles of `theme.css`, so a later role replaces an
// earlier one instead of both landing on the element.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'chip', 'surface'],
      spacing: ['reach'],
      text: ['title'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
