import type { Voice } from '@/packages/shared';

export interface VoicePage {
  items: Voice[];
  page: number;
  pageCount: number;
  total: number;
}

// Cloned voices lead the list — a user's own voice is the most likely pick.
// Stable within each group so the provider's ordering is otherwise preserved.
export function sortClonedFirst(voices: Voice[]): Voice[] {
  return [...voices].sort((a, b) => {
    const rank = (v: Voice) => (v.category === 'cloned' ? 0 : 1);
    return rank(a) - rank(b);
  });
}

// Page is 1-based and clamped into [1, pageCount]; pageCount is at least 1.
export function paginateVoices(voices: Voice[], page: number, pageSize: number): VoicePage {
  const total = voices.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(1, page), pageCount);
  const start = (clampedPage - 1) * pageSize;
  return {
    items: voices.slice(start, start + pageSize),
    page: clampedPage,
    pageCount,
    total,
  };
}
