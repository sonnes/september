import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The radius and type roles of `theme.css`, so a later role replaces an
// earlier one instead of both landing on the element.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'chip', 'surface'],
      text: ['title'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Text processing utilities
export const MATCH_PUNCTUATION = /[\p{P}$+<=>^`(\\\n)|~]/gu;
