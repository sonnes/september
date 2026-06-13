// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { BASE_VIEWPORT_WIDTH, isCompactWidth } from './use-compact';

// The base design viewport is the 13" iPad Pro (M4) in landscape: 1376px wide.
// At or below it the app shell runs compact (sidebar collapses to an icon rail);
// wider screens get the full layout.

describe('isCompactWidth', () => {
  it('treats the iPad 13" base width as compact', () => {
    expect(BASE_VIEWPORT_WIDTH).toBe(1376);
    expect(isCompactWidth(1376)).toBe(true); // 13" M4 landscape
  });

  it('is compact at and below the base (both iPad orientations)', () => {
    expect(isCompactWidth(1366)).toBe(true); // 12.9" landscape
    expect(isCompactWidth(1032)).toBe(true); // 13" portrait
    expect(isCompactWidth(768)).toBe(true);
  });

  it('is not compact above the base (laptops and desktops)', () => {
    expect(isCompactWidth(1377)).toBe(false); // one past the base boundary
    expect(isCompactWidth(1440)).toBe(false);
    expect(isCompactWidth(1920)).toBe(false);
  });
});
