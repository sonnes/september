import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('desktop UI assets', () => {
  for (const file of ['elevenlabs-mark.svg', 'openrouter-mark.svg']) {
    it(`ships ${file}`, async () => {
      await expect(access(resolve('public', file))).resolves.toBeUndefined();
    });
  }
});
