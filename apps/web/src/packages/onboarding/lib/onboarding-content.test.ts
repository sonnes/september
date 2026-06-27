import { describe, expect, it } from 'vitest';

import { ONBOARDING_PRIMARY_COPY, ONBOARDING_STEPS } from './onboarding-content';

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe('onboarding content', () => {
  it('uses the mode-centered four-step flow with About you before Choose setup', () => {
    expect(ONBOARDING_STEPS.map(step => step.label)).toEqual([
      'Welcome',
      'About you',
      'Choose setup',
      'Finish',
    ]);
  });

  it('keeps primary copy non-technical', () => {
    const copy = collectStrings(ONBOARDING_PRIMARY_COPY).join('\n');

    expect(copy).not.toMatch(/\b(LLM|corpus|provider|API key|models?)\b/i);
  });

  it('centers the flow on a mode choice with branched finish copy', () => {
    expect(ONBOARDING_PRIMARY_COPY.mode.eyebrow).toBe('Step 3 of 4');
    expect(ONBOARDING_PRIMARY_COPY.finish.privacy.summary.length).toBeGreaterThan(0);
    expect(ONBOARDING_PRIMARY_COPY.finish.free.connectAction).toMatch(/OpenRouter/);
    expect(ONBOARDING_PRIMARY_COPY.finish.advanced.title).toBe('Connect your services.');
  });

  it('keeps the welcome step informational instead of card-shaped choices', () => {
    expect('cards' in ONBOARDING_PRIMARY_COPY.welcome).toBe(false);
    expect('path' in ONBOARDING_PRIMARY_COPY.welcome).toBe(true);
  });

  it('uses approachable profile-step language', () => {
    expect(ONBOARDING_PRIMARY_COPY.profile.title).toBe('Tell us about yourself.');
  });

  it('offers default speaking-style personas', () => {
    expect(ONBOARDING_PRIMARY_COPY.profile.personas.map(persona => persona.label)).toEqual([
      'Plain',
      'Warm',
      'Detailed',
    ]);
  });
});
