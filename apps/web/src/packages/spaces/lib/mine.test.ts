import { describe, expect, it } from 'vitest';

import type { Message, SavedPhrase } from '../types';
import { isCommonWord } from './codes';
import { mineShortcuts } from './mine';

const NOW = new Date('2026-07-18T12:00:00Z');

let seq = 0;
function msg(text: string, daysAgo = 0, type = 'user'): Message {
  return {
    id: `m-${seq++}`,
    text,
    type,
    user_id: 'u',
    created_at: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

function repeat(text: string, times: number, daysAgo = 0): Message[] {
  return Array.from({ length: times }, () => msg(text, daysAgo));
}

function phraseRow(text: string, code?: string): SavedPhrase {
  return {
    id: text,
    space_id: 's',
    user_id: 'u',
    text,
    pinned: false,
    code,
    created_at: new Date(0),
  };
}

const baseOpts = {
  existingPhrases: [] as SavedPhrase[],
  dismissed: new Set<string>(),
  now: NOW,
};

describe('mineShortcuts', () => {
  it('proposes a frequently repeated message with a generated code', () => {
    const messages = repeat('Can you turn the volume down', 6);
    const [proposal] = mineShortcuts(messages, baseOpts);

    expect(proposal).toBeTruthy();
    expect(proposal.text).toBe('Can you turn the volume down');
    expect(proposal.count).toBe(6);
    expect(proposal.code).toBeTruthy();
    expect(isCommonWord(proposal.code)).toBe(false);
  });

  it('ignores messages below the frequency threshold', () => {
    expect(mineShortcuts(repeat('Can you turn the volume down', 4), baseOpts)).toEqual([]);
  });

  it('ignores short phrases (fewer than 3 words)', () => {
    expect(mineShortcuts(repeat('thank you', 20), baseOpts)).toEqual([]);
  });

  it('ignores non-user messages', () => {
    const messages = repeat('Can you turn the volume down', 3).concat(
      Array.from({ length: 5 }, () => msg('Can you turn the volume down', 0, 'assistant'))
    );
    expect(mineShortcuts(messages, baseOpts)).toEqual([]);
  });

  it('counts case/punctuation variants together and keeps a real surface form', () => {
    const messages = [
      ...repeat('can you turn the volume down', 3),
      ...repeat('Can you turn the volume down.', 3),
    ];
    const [proposal] = mineShortcuts(messages, baseOpts);
    expect(proposal.count).toBe(6);
    expect(proposal.text.toLowerCase().replace(/[.!?]+$/, '')).toBe(
      'can you turn the volume down'
    );
  });

  it('finds repeated phrases inside longer messages (n-grams)', () => {
    const messages = [
      ...repeat('I want to go to the bathroom please', 3),
      ...repeat('Now I want to go to the bathroom right away', 3),
    ];
    const proposals = mineShortcuts(messages, baseOpts);
    expect(proposals.some(p => p.text.toLowerCase().includes('want to go to the bathroom'))).toBe(
      true
    );
  });

  it('keeps only the maximal phrase, not its sub-phrases', () => {
    const messages = repeat('Can you turn the volume down', 6);
    const proposals = mineShortcuts(messages, baseOpts);
    expect(proposals).toHaveLength(1);
  });

  it('excludes candidates matching an existing phrase of either provenance', () => {
    const messages = repeat('Can you turn the volume down', 6);
    const proposals = mineShortcuts(messages, {
      ...baseOpts,
      existingPhrases: [phraseRow('can you turn the volume down', 'ctv')],
    });
    expect(proposals).toEqual([]);
  });

  it('excludes dismissed candidates', () => {
    const messages = repeat('Can you turn the volume down', 6);
    const proposals = mineShortcuts(messages, {
      ...baseOpts,
      dismissed: new Set(['can you turn the volume down']),
    });
    expect(proposals).toEqual([]);
  });

  it('never proposes a code colliding with existing codes', () => {
    const messages = repeat('please call nurse', 6);
    const [proposal] = mineShortcuts(messages, {
      ...baseOpts,
      existingPhrases: [phraseRow('Some other phrase', 'pcn')],
    });
    expect(proposal.code).not.toBe('pcn');
  });

  it('decays old repetitions so stale habits rank below fresh ones', () => {
    const messages = [
      ...repeat('this is my old stale sentence', 6, 300),
      ...repeat('this is my fresh new sentence', 6, 1),
    ];
    const proposals = mineShortcuts(messages, baseOpts);
    expect(proposals[0].text).toBe('this is my fresh new sentence');
  });

  it('caps proposals at 5, ranked by score', () => {
    const messages = [
      ...repeat('sentence number one is here now', 10),
      ...repeat('sentence number two is here now', 9),
      ...repeat('sentence number three is here now', 8),
      ...repeat('sentence number four is here now', 7),
      ...repeat('sentence number five is here now', 6),
      ...repeat('sentence number six is here now', 5),
    ];
    const proposals = mineShortcuts(messages, baseOpts);
    expect(proposals.length).toBeLessThanOrEqual(5);
    expect(proposals[0].text).toBe('sentence number one is here now');
  });
});
