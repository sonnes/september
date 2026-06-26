import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCursorStore } from './cursor';
import { memoryStorage } from './test-storage';

describe('createCursorStore', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('defaults to 0', () => {
    expect(createCursorStore('u1').get()).toBe(0);
  });

  it('persists per user', () => {
    createCursorStore('u1').set(42);
    expect(createCursorStore('u1').get()).toBe(42);
    expect(createCursorStore('u2').get()).toBe(0); // isolated per user
  });
});
