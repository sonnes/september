import { createFileRoute } from '@tanstack/react-router';

import { SpeechProvider } from '@/packages/speech';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

import SettingsForm from './-settings-form';

export const Route = createFileRoute('/_app/settings/')({
  head: () => ({
    meta: [
      { title: pageTitle('Settings') },
      { name: 'description', content: 'Manage your September account and preferences.' },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Settings' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="form">
          <PageTitle title="Settings" description="Your personal information and preferences." />
          <SpeechProvider>
            <SettingsForm />
          </SpeechProvider>
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
