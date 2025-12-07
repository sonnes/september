import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Text processing utilities
export const MATCH_PUNCTUATION = /[\p{P}$+<=>^`(\\\n)|~]/gu;
