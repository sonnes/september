import { createFileRoute } from '@tanstack/react-router';

import { SpeechProvider } from '@/packages/speech';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

import SettingsForm from './-settings-form';

export const Route = createFileRoute('/_app/settings/')({
  head: () => ({
    meta: [
      { title: pageTitle('Account') },
      { name: 'description', content: 'Manage your September account and preferences.' },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Account" description="Your personal information and preferences." />
      <SpeechProvider>
        <SettingsForm />
      </SpeechProvider>
    </div>
  );
}
