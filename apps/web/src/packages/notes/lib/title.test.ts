import { describe, expect, it } from 'vitest';

import { noteContentUpdates, noteNameFromContent, noteNameIsUnset } from './title';

describe('noteNameFromContent', () => {
  it('uses the first readable words from note content', () => {
    expect(noteNameFromContent('# Appointment prep\nBring insurance card')).toBe(
      'Appointment prep Bring insurance card'
    );
  });

  it('strips markdown links and emphasis', () => {
    expect(noteNameFromContent('Thank **you** [friend](https://example.test)')).toBe(
      'Thank you friend'
    );
  });
});

describe('noteNameIsUnset', () => {
  it('treats blank and placeholder names as unset', () => {
    expect(noteNameIsUnset(undefined)).toBe(true);
    expect(noteNameIsUnset('')).toBe(true);
    expect(noteNameIsUnset('Untitled note')).toBe(true);
  });
});

describe('noteContentUpdates', () => {
  it('adds a generated name only when the current name is unset', () => {
    expect(noteContentUpdates('Untitled note', 'Follow up with nurse')).toEqual({
      content: 'Follow up with nurse',
      name: 'Follow up with nurse',
    });

    expect(noteContentUpdates('Care plan', 'Follow up with nurse')).toEqual({
      content: 'Follow up with nurse',
    });
  });
});
