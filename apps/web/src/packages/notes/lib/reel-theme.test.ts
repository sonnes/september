import { describe, expect, it } from 'vitest';

import type { ReelCaption } from './reel';
import {
  captionRoles,
  DEFAULT_PAIR_KEY,
  REEL_PAIRS,
  reelPair,
  roleColors,
  ROLE_SPECS,
  SPOKEN_OPACITY,
  UNSPOKEN_OPACITY,
} from './reel-theme';

function caption(text: string): ReelCaption {
  const words = text.split(' ').map((word, index) => ({
    text: word,
    startTime: index,
    endTime: index + 1,
  }));
  return { startTime: words[0].startTime, endTime: words[words.length - 1].endTime, words };
}

describe('REEL_PAIRS', () => {
  it('has six pairs with unique keys and complete hex + class tokens', () => {
    expect(REEL_PAIRS).toHaveLength(6);
    expect(new Set(REEL_PAIRS.map(p => p.key)).size).toBe(6);

    for (const pair of REEL_PAIRS) {
      expect(pair.bg).toMatch(/^#[0-9a-f]{6}$/);
      expect(pair.display).toMatch(/^#[0-9a-f]{6}$/);
      expect(pair.support).toMatch(/^#[0-9a-f]{6}$/);
      expect(pair.bgClass).toMatch(/^bg-/);
      expect(pair.name).toBeTruthy();
    }
  });

  it('defaults to stone', () => {
    expect(DEFAULT_PAIR_KEY).toBe('stone');
    expect(reelPair('stone').bg).toBe('#1c1917');
  });

  it('falls back to the default pair for an unknown key', () => {
    // @ts-expect-error — exercising the runtime fallback
    expect(reelPair('nope')).toBe(reelPair(DEFAULT_PAIR_KEY));
  });
});

describe('captionRoles', () => {
  it('marks the first chunk as display', () => {
    expect(captionRoles([caption('Good morning')])).toEqual(['display']);
  });

  it('marks a chunk after a sentence end as display for . ! and ?', () => {
    for (const end of ['.', '!', '?']) {
      const roles = captionRoles([caption(`Done${end}`), caption('Next chunk')]);
      expect(roles).toEqual(['display', 'display']);
    }
  });

  it('marks a chunk after a comma/semicolon/colon continuation as support', () => {
    for (const end of [',', ';', ':']) {
      const roles = captionRoles([caption(`wait${end}`), caption('then more')]);
      expect(roles).toEqual(['display', 'support']);
    }
  });

  it('derives a full sequence deterministically', () => {
    const captions = [
      caption('Good morning, everyone.'),
      caption('Today felt like a good day.'),
      caption('We watched the rain'),
      caption('from the porch,'),
      caption('and Sarah made her famous chai.'),
      caption('Small moments,'),
      caption('big joy.'),
    ];
    expect(captionRoles(captions)).toEqual([
      'display',
      'display',
      'display',
      'support',
      'support',
      'display',
      'support',
    ]);
  });
});

describe('ROLE_SPECS', () => {
  it('uses Playfair for display and Noto Sans for support', () => {
    expect(ROLE_SPECS.display.fontFamily).toContain('Playfair Display');
    expect(ROLE_SPECS.display.fontWeight).toBe(500);
    expect(ROLE_SPECS.support.fontFamily).toContain('Noto Sans');
    expect(ROLE_SPECS.support.fontWeight).toBe(700);
    expect(ROLE_SPECS.display.boxHeightRatio).toBeGreaterThan(ROLE_SPECS.support.boxHeightRatio);
    expect(ROLE_SPECS.display.maxFontRatio).toBeGreaterThan(ROLE_SPECS.support.maxFontRatio);
  });
});

describe('roleColors', () => {
  const pair = reelPair('stone');

  it('display: base is the display tint, active swaps to support', () => {
    expect(roleColors(pair, 'display')).toEqual({ base: pair.display, active: pair.support });
  });

  it('support: base is the support tint, active swaps to display', () => {
    expect(roleColors(pair, 'support')).toEqual({ base: pair.support, active: pair.display });
  });
});

describe('word-state opacity', () => {
  it('dims spoken more than unspoken', () => {
    expect(SPOKEN_OPACITY).toBeLessThan(UNSPOKEN_OPACITY);
    expect(UNSPOKEN_OPACITY).toBeLessThan(1);
  });
});
