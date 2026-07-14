import { createFileRoute } from '@tanstack/react-router';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

import SetupForm from './-setup-form';

export const Route = createFileRoute('/_app/settings/')({
  head: () => ({
    meta: [
      { title: pageTitle('Setup') },
      { name: 'description', content: 'Pick how September runs and connect its services.' },
    ],
  }),
  // OpenRouter OAuth returns here with ?code (old /settings/providers callbacks
  // are redirected here with the code preserved).
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s.code === 'string' ? { code: s.code } : {},
  component: SetupPage,
});

function SetupPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Setup"
        description="Pick how September runs — one choice sets up everything else."
      />
      <SetupForm />
    </div>
  );
}
