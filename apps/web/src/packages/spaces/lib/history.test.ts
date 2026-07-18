import { describe, expect, it } from 'vitest';

import type { Message } from '../types';
import { HISTORY_PAGE_SIZE, historyPage } from './history';

function messages(n: number): Message[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `m${i}`,
    type: 'user',
    user_id: 'u',
    created_at: new Date(i),
  })) as Message[];
}

describe('historyPage', () => {
  it('defaults the page size to 20', () => {
    expect(HISTORY_PAGE_SIZE).toBe(20);
  });

  it('reports a single page and empty slice with no messages', () => {
    expect(historyPage([], 0)).toEqual({ pageCount: 1, page: 0, slice: [] });
  });

  it('page 0 holds the newest page-size messages in ascending order', () => {
    const all = messages(45);
    const { pageCount, page, slice } = historyPage(all, 0);
    expect(pageCount).toBe(3);
    expect(page).toBe(0);
    expect(slice).toEqual(all.slice(25, 45));
  });

  it('later pages walk backwards to older messages', () => {
    const all = messages(45);
    expect(historyPage(all, 1).slice).toEqual(all.slice(5, 25));
    expect(historyPage(all, 2).slice).toEqual(all.slice(0, 5));
  });

  it('clamps a page past the end to the last page', () => {
    const all = messages(45);
    const { page, slice } = historyPage(all, 9);
    expect(page).toBe(2);
    expect(slice).toEqual(all.slice(0, 5));
  });

  it('clamps a negative page to 0', () => {
    const all = messages(45);
    expect(historyPage(all, -3).page).toBe(0);
  });

  it('honors a custom page size', () => {
    const all = messages(10);
    const { pageCount, slice } = historyPage(all, 0, 4);
    expect(pageCount).toBe(3);
    expect(slice).toEqual(all.slice(6, 10));
  });
});
