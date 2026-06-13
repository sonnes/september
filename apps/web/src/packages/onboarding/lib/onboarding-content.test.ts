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
  it('uses the selected four-step flow', () => {
    expect(ONBOARDING_STEPS.map(step => step.label)).toEqual([
      'Welcome',
      'You',
      'Voice',
      'Suggestions',
    ]);
  });

  it('keeps primary copy non-technical', () => {
    const copy = collectStrings(ONBOARDING_PRIMARY_COPY).join('\n');

    expect(copy).not.toMatch(/\b(LLM|corpus|provider|API key|models?)\b/i);
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
