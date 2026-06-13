import { describe, expect, it } from 'vitest';

import { editCost } from './keyboard-layout';

describe('keyboard-layout', () => {
  describe('editCost — identical characters', () => {
    it('returns 0 for same lowercase char', () => {
      expect(editCost('a', 'a')).toBe(0);
    });

    it('returns 0 across casing (case-folds)', () => {
      expect(editCost('A', 'a')).toBe(0);
    });
  });

  describe('editCost — adjacent QWERTY keys', () => {
    it('returns 0.3 for horizontally adjacent keys', () => {
      expect(editCost('r', 't')).toBe(0.3);
      expect(editCost('a', 's')).toBe(0.3);
      expect(editCost('m', 'n')).toBe(0.3);
    });

    it('returns 0.3 for vertically adjacent keys', () => {
      expect(editCost('s', 'w')).toBe(0.3);
      expect(editCost('d', 'c')).toBe(0.3);
    });

    it('returns 0.3 for diagonally adjacent keys (distance ≤ √2)', () => {
      expect(editCost('s', 'e')).toBe(0.3); // s(1,1), e(2,0) → √2
      expect(editCost('d', 'x')).toBe(0.3);
    });

    it('case-folds uppercase inputs', () => {
      expect(editCost('R', 'T')).toBe(0.3);
      expect(editCost('R', 't')).toBe(0.3);
    });
  });

  describe('editCost — same-hand non-adjacent keys', () => {
    it('returns 0.7 for keys 2–3 units apart', () => {
      expect(editCost('q', 'e')).toBe(0.7); // q(0,0) e(2,0) → 2
      expect(editCost('q', 'r')).toBe(0.7); // q(0,0) r(3,0) → 3
    });
  });

  describe('editCost — far-apart keys', () => {
    it('returns 1.0 for keys across the keyboard', () => {
      expect(editCost('q', 'p')).toBe(1.0); // opposite ends of top row
      expect(editCost('z', 'p')).toBe(1.0); // opposite corners
    });
  });

  describe('editCost — non-alphabetic characters', () => {
    it('returns 1.0 for any substitution involving a non-letter', () => {
      expect(editCost('é', 'a')).toBe(1.0);
      expect(editCost('1', 'a')).toBe(1.0);
      expect(editCost(' ', 'a')).toBe(1.0);
    });

    it('returns 0 for identical non-letters', () => {
      expect(editCost('é', 'é')).toBe(0);
      expect(editCost(' ', ' ')).toBe(0);
    });
  });

  describe('editCost — defensive inputs', () => {
    it('returns 1.0 for multi-char strings (treats as unknown)', () => {
      expect(editCost('ab', 'a')).toBe(1.0);
    });

    it('returns 1.0 for empty strings vs a letter', () => {
      expect(editCost('', 'a')).toBe(1.0);
    });
  });
});
