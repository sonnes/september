// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '@/test/storage';

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
  const spaceSlug = 'school-homework-help';

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });

  it('defaults to talk when nothing is stored', () => {
    expect(lastSpaceMode(spaceSlug)).toBe('talk');
  });

  it('remembers the last mode per space slug', () => {
    rememberSpaceMode(spaceSlug, 'notes');
    expect(lastSpaceMode(spaceSlug)).toBe('notes');
    expect(localStorage.getItem(`september:space-mode:${spaceSlug}`)).toBe('notes');
  });

  it('keeps modes independent across spaces', () => {
    const other = 'teaching-scratch-jr';
    rememberSpaceMode(spaceSlug, 'notes');
    rememberSpaceMode(other, 'talk');
    expect(lastSpaceMode(spaceSlug)).toBe('notes');
    expect(lastSpaceMode(other)).toBe('talk');
  });

  it('ignores unknown stored values and falls back to talk', () => {
    localStorage.setItem(`september:space-mode:${spaceSlug}`, 'agent');
    expect(lastSpaceMode(spaceSlug)).toBe('talk');
  });
});

describe('notesRouteParams', () => {
  it('generates id-free slugs from space and note titles', () => {
    expect(notesRouteParams('General', 'Appointment Prep')).toEqual({
      spaceSlug: 'general',
      noteSlug: 'appointment-prep',
    });
  });

  it('omits the note slug when no note title is given', () => {
    expect(notesRouteParams('General')).toEqual({ spaceSlug: 'general' });
  });

  it('detects fallback slugs as stale once titles are known', () => {
    expect(
      isNotesRouteCanonical({
        spaceSlug: 'space',
        noteSlug: 'untitled-note',
        spaceTitle: 'General',
        noteTitle: 'Appointment Prep',
        hasNote: true,
      })
    ).toBe(false);
  });

  it('accepts a canonical id-free notes route', () => {
    expect(
      isNotesRouteCanonical({
        spaceSlug: 'general',
        noteSlug: 'appointment-prep',
        spaceTitle: 'General',
        noteTitle: 'Appointment Prep',
        hasNote: true,
      })
    ).toBe(true);
  });
});
