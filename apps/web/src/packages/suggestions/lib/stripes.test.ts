import { describe, expect, it } from 'vitest';

import {
  appendTokens,
  boardPhrases,
  boardWords,
  composeSuggestions,
  hiddenTokenCount,
  historyMatches,
  joinTokens,
  stripeForText,
  tokenize,
} from './stripes';

describe('tokenize', () => {
  it('splits words on spaces', () => {
    expect(tokenize('I need water')).toEqual(['I', 'need', 'water']);
  });

  it('splits trailing punctuation into its own token', () => {
    expect(tokenize('Good morning, how are you?')).toEqual([
      'Good',
      'morning',
      ',',
      'how',
      'are',
      'you',
      '?',
    ]);
  });

  it('keeps multi-character punctuation together', () => {
    expect(tokenize('Really?!')).toEqual(['Really', '?!']);
  });
});

describe('joinTokens', () => {
  it('reattaches punctuation and adds a trailing space', () => {
    expect(joinTokens(['Good', 'morning', ',', 'how'])).toBe('Good morning, how ');
  });

  it('round-trips a full sentence', () => {
    expect(joinTokens(tokenize('Yes, I can.'))).toBe('Yes, I can. ');
  });
});

describe('hiddenTokenCount', () => {
  const tokens = tokenize('I need some water, please.');

  it('is 0 for empty input', () => {
    expect(hiddenTokenCount(tokens, '')).toBe(0);
  });

  it('hides fully typed leading words', () => {
    expect(hiddenTokenCount(tokens, 'I need ')).toBe(2);
  });

  it('does not hide a partially typed word', () => {
    expect(hiddenTokenCount(tokens, 'I nee')).toBe(1);
  });

  it('ignores case', () => {
    expect(hiddenTokenCount(tokens, 'i need')).toBe(2);
  });
});

describe('historyMatches', () => {
  const history = ['I need water', 'Good night', 'I need help'];

  it('is empty for blank input', () => {
    expect(historyMatches('', history)).toEqual([]);
  });

  it('returns prefix matches, most recent first', () => {
    expect(historyMatches('I need', history)).toEqual(['I need help', 'I need water']);
  });

  it('excludes the exact current text but keeps longer matches', () => {
    expect(historyMatches('I need water', ['I need water', 'I need water now'])).toEqual([
      'I need water now',
    ]);
  });
});

describe('boardWords / boardPhrases', () => {
  const entries = [
    'Good morning, how are you today?',
    'I would like some water, please.',
    'I would like to rest for a while.',
    'Please turn on the lights.',
    'Thank you so much for your help.',
    'Yes',
    'No',
    'Later',
    'Water',
    'Bathroom',
    'Television',
  ];

  it('words are single-token entries', () => {
    for (const w of boardWords(entries)) {
      expect(tokenize(w)).toHaveLength(1);
    }
  });

  it('phrases are multi-token entries', () => {
    for (const p of boardPhrases(entries)) {
      expect(tokenize(p).length).toBeGreaterThan(1);
    }
  });

  it('words and phrases partition entries without overlap', () => {
    const words = boardWords(entries);
    const phrases = boardPhrases(entries);
    expect(words.length + phrases.length).toBe(entries.length);
    for (const w of words) expect(phrases).not.toContain(w);
  });
});

describe('composeSuggestions', () => {
  const boardEntries = [
    'Good morning, how are you today?',
    'I would like some water, please.',
    'I would like to rest for a while.',
    'Please turn on the lights.',
    'Thank you so much for your help.',
    'Yes',
    'No',
    'Later',
    'Water',
    'Bathroom',
    'Television',
  ];

  it('pins board phrases first when blank', () => {
    const out = composeSuggestions({
      typed: '',
      mdPhrases: boardPhrases(boardEntries),
      history: [],
      llm: [],
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].source).toBe('md');
  });

  it('only pins board phrases matching the typed prefix', () => {
    const out = composeSuggestions({
      typed: 'I would',
      mdPhrases: boardPhrases(boardEntries),
      history: [],
      llm: [],
    });
    for (const s of out.filter(s => s.source === 'md')) {
      expect(s.text.toLowerCase().startsWith('i would')).toBe(true);
    }
  });

  it('dedupes so each sentence appears once', () => {
    const out = composeSuggestions({
      typed: '',
      mdPhrases: boardPhrases(boardEntries),
      history: [],
      llm: [],
    });
    expect(new Set(out.map(s => s.text.toLowerCase())).size).toBe(out.length);
  });

  it('returns only LLM suggestions when board is empty and no history', () => {
    const llm = ['Hello world', 'How are you today?'];
    const out = composeSuggestions({ typed: '', mdPhrases: [], history: [], llm });
    expect(out.every(s => s.source === 'llm')).toBe(true);
  });

  it('caps output at MAX_COMPOSED (6)', () => {
    const llm = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const out = composeSuggestions({ typed: '', mdPhrases: [], history: [], llm });
    expect(out.length).toBeLessThanOrEqual(6);
  });

  it('excludes the exact typed string', () => {
    const typed = 'I need water';
    const out = composeSuggestions({
      typed,
      mdPhrases: [],
      history: [typed, 'I need water now'],
      llm: [typed],
    });
    for (const s of out) {
      expect(s.text.toLowerCase()).not.toBe(typed.toLowerCase());
    }
  });
});

describe('composeSuggestions with history', () => {
  const boardEntries = [
    'I would like some water, please.',
    'I would like to rest for a while.',
  ];

  it('orders board, then history, then llm', () => {
    const out = composeSuggestions({
      typed: 'I would',
      mdPhrases: boardPhrases(boardEntries),
      history: ['I would walk to the park'],
      llm: ['I would love to see you'],
    });
    const sources = out.map(s => s.source);
    const boardIdx = sources.indexOf('md');
    const historyIdx = sources.indexOf('history');
    const llmIdx = sources.indexOf('llm');
    expect(boardIdx).toBeLessThan(historyIdx);
    if (llmIdx !== -1) {
      expect(historyIdx).toBeLessThan(llmIdx);
    }
  });

  it('tags history-sourced matches', () => {
    const out = composeSuggestions({
      typed: 'Good even',
      mdPhrases: [],
      history: ['Good evening everyone'],
      llm: [],
    });
    expect(out.some(s => s.source === 'history' && s.text === 'Good evening everyone')).toBe(true);
  });

  it('dedupes so a board phrase outranks the same phrase from history', () => {
    const phrase = 'I would like some water, please.';
    const out = composeSuggestions({
      typed: 'I would like',
      mdPhrases: boardPhrases(boardEntries),
      history: [phrase],
      llm: [],
    });
    const matches = out.filter(s => s.text.toLowerCase() === phrase.toLowerCase());
    expect(matches).toHaveLength(1);
    expect(matches[0].source).toBe('md');
  });
});

describe('stripeForText', () => {
  it('returns tokens and hidden count for a matching prefix', () => {
    const result = stripeForText('I need some water, please.', 'I need');
    expect(result.tokens).toEqual(tokenize('I need some water, please.'));
    expect(result.hidden).toBe(2);
    expect(result.text).toBe('I need some water, please.');
  });

  it('hidden is 0 when typed is empty', () => {
    const result = stripeForText('Hello world', '');
    expect(result.hidden).toBe(0);
  });

  it('hidden equals token count when all tokens match', () => {
    const result = stripeForText('Yes', 'yes');
    expect(result.hidden).toBe(result.tokens.length);
  });
});

describe('appendTokens', () => {
  it('appends a single word to existing text', () => {
    expect(appendTokens('I need', 'water')).toBe('I need water ');
  });

  it('appends a phrase to existing text', () => {
    expect(appendTokens('I', 'need water')).toBe('I need water ');
  });

  it('works when base text is empty', () => {
    expect(appendTokens('', 'Hello')).toBe('Hello ');
  });
});
