import type { Message } from '../types';

/** How many messages a single History page shows. */
export const HISTORY_PAGE_SIZE = 20;

export interface HistoryPage {
  /** Total number of pages (at least 1, even when empty). */
  pageCount: number;
  /** The requested page, clamped into `[0, pageCount - 1]`. Page 0 is newest. */
  page: number;
  /**
   * The messages for this page in ascending (oldest-first) order, ready to hand
   * to `MessageList` — which reverses them so the newest sits at the top.
   */
  slice: Message[];
}

/**
 * Split a space's messages (ascending by `created_at`) into pages, newest
 * first. Page 0 holds the most recent `pageSize` messages; higher pages walk
 * backwards through older ones.
 */
export function historyPage(
  messages: Message[],
  page: number,
  pageSize: number = HISTORY_PAGE_SIZE
): HistoryPage {
  const pageCount = Math.max(1, Math.ceil(messages.length / pageSize));
  const clamped = Math.min(Math.max(page, 0), pageCount - 1);
  const end = messages.length - clamped * pageSize;
  const start = Math.max(0, end - pageSize);
  return { pageCount, page: clamped, slice: messages.slice(start, end) };
}
