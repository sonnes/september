import { describe, expect, it } from 'vitest';

import type { Message } from '@/packages/spaces';

import { buildSuggestionPrompt } from './context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function msg(type: string, text: string): Message {
  return {
    id: crypto.randomUUID(),
    text,
    type,
    user_id: 'u1',
    created_at: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

describe('buildSuggestionPrompt — context assembly', () => {
  it('uses globalMd only when spaceMd is empty', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: 'global context',
      spaceMd: '',
      history: [],
      typed: '',
    });
    expect(system).toContain('global context');
  });

  it('uses spaceMd only when globalMd is empty', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: 'space context',
      history: [],
      typed: '',
    });
    expect(system).toContain('space context');
  });

  it('puts globalMd first, separated by blank line when both present', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: 'global context',
      spaceMd: 'space context',
      history: [],
      typed: '',
    });
    const globalIdx = system.indexOf('global context');
    const spaceIdx = system.indexOf('space context');
    expect(globalIdx).toBeGreaterThanOrEqual(0);
    expect(spaceIdx).toBeGreaterThanOrEqual(0);
    expect(globalIdx).toBeLessThan(spaceIdx);
    // Separated by blank line in the assembled context
    expect(system).toContain('global context\n\nspace context');
  });

  it('omits the user-context block entirely when both globalMd and spaceMd are empty', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: '',
    });
    expect(system.length).toBeGreaterThan(0);
    expect(system).not.toContain('<user_context>');
  });

  it('wraps the assembled context in a <user_context> block when present', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: 'global context',
      spaceMd: '',
      history: [],
      typed: '',
    });
    expect(system).toContain('<user_context>\nglobal context\n</user_context>');
  });

  it('trims whitespace from globalMd and spaceMd before joining', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '  global  ',
      spaceMd: '  space  ',
      history: [],
      typed: '',
    });
    expect(system).toContain('global\n\nspace');
  });

  it('filters out blank entries so no leading/trailing blank line separator', () => {
    const result = buildSuggestionPrompt({
      globalMd: '   ',
      spaceMd: 'space context',
      history: [],
      typed: '',
    });
    // assembled context should just be 'space context', not '\n\nspace context'
    expect(result.system).toContain('space context');
    expect(result.system).not.toContain('\n\nspace context');
  });
});

// ---------------------------------------------------------------------------
// History formatting
// ---------------------------------------------------------------------------

describe('buildSuggestionPrompt — history formatting', () => {
  it('formats user messages as "Me: <text>"', () => {
    const { user } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [msg('user', 'Hello')],
      typed: '',
    });
    expect(user).toContain('Me: Hello');
  });

  it('formats transcription messages as "Them: <text>"', () => {
    const { user } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [msg('transcription', 'Hi there')],
      typed: '',
    });
    expect(user).toContain('Them: Hi there');
  });

  it('formats mixed history in order', () => {
    const { user } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [msg('user', 'Hello'), msg('transcription', 'Hi'), msg('user', 'How are you?')],
      typed: '',
    });
    expect(user).toContain('Me: Hello\nThem: Hi\nMe: How are you?');
  });
});

// ---------------------------------------------------------------------------
// Branch selection: opening vs completion
// ---------------------------------------------------------------------------

describe('buildSuggestionPrompt — opening mode (typed empty or whitespace)', () => {
  it('uses the opening prompt when typed is empty string', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: '',
    });
    // Opening prompt instructs 5 "next things" — use a distinctive phrase
    expect(system).toContain('NEXT things the User might WANT TO SAY');
  });

  it('uses the opening prompt when typed is only whitespace', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: '   ',
    });
    expect(system).toContain('NEXT things the User might WANT TO SAY');
  });

  it('puts conversation in the user message and context only in system', () => {
    const { system, user } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: 'space md',
      history: [msg('user', 'Hello')],
      typed: '',
    });
    expect(user).toContain('Conversation:');
    expect(user).not.toContain('Current input:');
    // Context is not duplicated into the user message
    expect(user).not.toContain('space md');
    expect(system).toContain('space md');
  });
});

describe('buildSuggestionPrompt — completion mode (typed non-empty)', () => {
  it('uses the completion prompt when typed has text', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    // Completion prompt asks to complete partial input
    expect(system).toContain("Complete the User's partial input");
  });

  it('includes "Current input:" in user message for completion mode', () => {
    const { user } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    expect(user).toContain('Current input: "I need"');
  });

  it('includes conversation block in completion mode user message', () => {
    const { user } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [msg('user', 'Hello')],
      typed: 'I need',
    });
    expect(user).toContain('Conversation:');
    expect(user).toContain('Me: Hello');
  });

  it('does not duplicate context into the completion user message', () => {
    const { system, user } = buildSuggestionPrompt({
      globalMd: 'my context',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    expect(user).not.toContain('my context');
    expect(system).toContain('my context');
  });

  it('does NOT use opening prompt phrasing in completion mode', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    expect(system).not.toContain('NEXT things the User might WANT TO SAY');
  });
});

// ---------------------------------------------------------------------------
// Context substitution replaces {USER_CONTEXT}
// ---------------------------------------------------------------------------

describe('buildSuggestionPrompt — no placeholder left in output', () => {
  it('does not leave {USER_CONTEXT} in opening system prompt', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: 'my context',
      spaceMd: '',
      history: [],
      typed: '',
    });
    expect(system).not.toContain('{USER_CONTEXT}');
  });

  it('does not leave {USER_CONTEXT} in completion system prompt', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: 'my context',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    expect(system).not.toContain('{USER_CONTEXT}');
  });
});

// ---------------------------------------------------------------------------
// Length bound: predictions asked for as 5-7 word sentences
// ---------------------------------------------------------------------------

describe('buildSuggestionPrompt — 5-7 word bound', () => {
  it('states the 5-7 word bound in opening mode', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: '',
    });
    expect(system).toContain('5-7 words');
  });

  it('states the 5-7 word bound in completion mode', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    expect(system).toContain('5-7 words');
  });
});

// ---------------------------------------------------------------------------
// Structured output: no raw-JSON instructions (schema enforces the shape)
// ---------------------------------------------------------------------------

describe('buildSuggestionPrompt — output format left to the schema', () => {
  it('does not instruct raw JSON output in opening mode', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: '',
    });
    expect(system).not.toContain('Return ONLY a JSON array');
  });

  it('does not instruct raw JSON output in completion mode', () => {
    const { system } = buildSuggestionPrompt({
      globalMd: '',
      spaceMd: '',
      history: [],
      typed: 'I need',
    });
    expect(system).not.toContain('Return ONLY a JSON array');
  });
});
