// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '@/packages/sync/lib/test-storage';

import {
  isNotesRouteCanonical,
  lastSpaceMode,
  notesRouteParams,
  rememberSpaceMode,
  routeForSpaceMode,
} from './-space-mode';

describe('routeForSpaceMode', () => {
  it('maps talk mode to the space talk route', () => {
    expect(routeForSpaceMode('talk')).toBe('/spaces/$spaceSlug/talk');
  });

  it('maps notes mode to the space notes route', () => {
    expect(routeForSpaceMode('notes')).toBe('/spaces/$spaceSlug/notes');
  });
});

describe('last-mode memory', () => {
  const spaceId = '8720d2fc-787c-421b-8984-0e0eeb9138cb';

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('defaults to talk when nothing is stored', () => {
    expect(lastSpaceMode(spaceId)).toBe('talk');
  });

  it('remembers the last mode per space', () => {
    rememberSpaceMode(spaceId, 'notes');
    expect(lastSpaceMode(spaceId)).toBe('notes');
    expect(localStorage.getItem(`september:space-mode:${spaceId}`)).toBe('notes');
  });

  it('keeps modes independent across spaces', () => {
    const other = '00dd441a-3e6a-413a-a1df-6173ac614386';
    rememberSpaceMode(spaceId, 'notes');
    rememberSpaceMode(other, 'talk');
    expect(lastSpaceMode(spaceId)).toBe('notes');
    expect(lastSpaceMode(other)).toBe('talk');
  });

  it('ignores unknown stored values and falls back to talk', () => {
    localStorage.setItem(`september:space-mode:${spaceId}`, 'agent');
    expect(lastSpaceMode(spaceId)).toBe('talk');
  });
});

describe('notesRouteParams', () => {
  const spaceId = '8720d2fc-787c-421b-8984-0e0eeb9138cb';
  const noteId = '00dd441a-3e6a-413a-a1df-6173ac614386';

  it('generates slugs from space and note titles', () => {
    expect(notesRouteParams('General', spaceId, 'Appointment Prep', noteId)).toEqual({
      spaceSlug: `general-${spaceId}`,
      noteSlug: `appointment-prep-${noteId}`,
    });
  });

  it('detects fallback slugs as stale once titles are known', () => {
    expect(
      isNotesRouteCanonical({
        spaceSlug: `space-${spaceId}`,
        noteSlug: `untitled-note-${noteId}`,
        spaceTitle: 'General',
        spaceId,
        noteTitle: 'Appointment Prep',
        noteId,
      })
    ).toBe(false);
  });
});
