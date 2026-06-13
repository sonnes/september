/**
 * Regression test for sample collection logic
 *
 * REGRESSION: form.tsx used:
 *   const fileIds = uploadedFiles.length > 0 ? uploadedFiles : Object.values(recordings);
 *
 * This silently drops recordings whenever any upload is present, sending fewer
 * samples to ElevenLabs and producing lower-quality voice clones without any
 * error or warning.
 *
 * The fix extracts this into collectSampleIds() and merges both sources.
 */

import { describe, expect, it } from 'vitest';

import { collectSampleIds } from './collect-sample-ids';

describe('collectSampleIds', () => {
  it('[REGRESSION] includes BOTH uploads and recordings when both are present', () => {
    const uploadedFiles = ['path/upload/a.mp3', 'path/upload/b.mp3'];
    const recordings = { 'sample-1': 'path/recording/s1.webm', 'sample-2': 'path/recording/s2.webm' };

    const result = collectSampleIds(uploadedFiles, recordings);

    // Must contain all 4 — not just the 2 uploads
    expect(result).toHaveLength(4);
    expect(result).toContain('path/upload/a.mp3');
    expect(result).toContain('path/upload/b.mp3');
    expect(result).toContain('path/recording/s1.webm');
    expect(result).toContain('path/recording/s2.webm');
  });

  it('returns only uploads when no recordings exist', () => {
    const result = collectSampleIds(['path/upload/a.mp3'], {});
    expect(result).toEqual(['path/upload/a.mp3']);
  });

  it('returns only recordings when no uploads exist', () => {
    const result = collectSampleIds([], { s1: 'path/recording/s1.webm' });
    expect(result).toEqual(['path/recording/s1.webm']);
  });

  it('returns empty array when both are empty', () => {
    const result = collectSampleIds([], {});
    expect(result).toEqual([]);
  });

  it('deduplicates ids that appear in both sources', () => {
    // Shouldn't happen in practice, but be safe
    const sharedPath = 'path/shared.webm';
    const result = collectSampleIds([sharedPath], { s1: sharedPath });
    expect(result.filter(id => id === sharedPath)).toHaveLength(1);
  });
});
