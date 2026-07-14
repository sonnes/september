import { createFileRoute } from '@tanstack/react-router';

import { SpeechProvider } from '@/packages/speech';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

import VoiceForm from './-voice-form';

export const Route = createFileRoute('/_app/settings/voice')({
  head: () => ({
    meta: [{ title: pageTitle('Voice') }],
  }),
  component: VoiceSettingsPage,
});

function VoiceSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Voice" description="The voice that speaks for you." />
      <SpeechProvider>
        <VoiceForm />
      </SpeechProvider>
    </div>
  );
}
