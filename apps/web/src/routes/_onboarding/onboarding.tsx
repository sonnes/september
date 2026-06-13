import { createFileRoute } from '@tanstack/react-router';

import { OnboardingFlow, OnboardingProvider } from '@/packages/onboarding';
import { SpeechProvider } from '@/packages/speech';

import { pageTitle } from '@/lib/seo';

export const Route = createFileRoute('/_onboarding/onboarding')({
  // Onboarding reads `step` and the OpenRouter OAuth `code` from the URL
  // (via window.location.search); declare them so navigation keeps the query.
  validateSearch: (search: Record<string, unknown>) => ({
    step: search.step != null ? Number(search.step) : undefined,
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: pageTitle('Onboarding') },
      { name: 'description', content: 'Set up your September profile and preferences.' },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <SpeechProvider>
      <OnboardingProvider>
        <OnboardingFlow />
      </OnboardingProvider>
    </SpeechProvider>
  );
}
