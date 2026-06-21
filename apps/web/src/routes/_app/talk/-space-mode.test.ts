import { describe, expect, it } from 'vitest';

import {
  isNotesRouteCanonical,
  notesRouteParams,
  routeForSpaceMode,
  shouldShowSpaceSidePanel,
} from './-space-mode';

describe('routeForSpaceMode', () => {
  it('keeps talk mode on talk urls', () => {
    expect(routeForSpaceMode('talk')).toBe('/talk/$spaceSlug');
  });

  it('moves notes mode to notes urls', () => {
    expect(routeForSpaceMode('notes')).toBe('/notes/$spaceSlug');
  });
});

describe('shouldShowSpaceSidePanel', () => {
  it('hides notes panel when panel state is closed', () => {
    expect(shouldShowSpaceSidePanel('notes', false)).toBe(false);
  });

  it('shows notes panel when panel state is open', () => {
    expect(shouldShowSpaceSidePanel('notes', true)).toBe(true);
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
