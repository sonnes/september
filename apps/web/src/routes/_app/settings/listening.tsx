import { createFileRoute } from '@tanstack/react-router';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

import ListeningForm from './-listening-form';

export const Route = createFileRoute('/_app/settings/listening')({
  head: () => ({
    meta: [{ title: pageTitle('Listening') }],
  }),
  component: ListeningSettingsPage,
});

function ListeningSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Listening"
        description="Writes down what people around you say, so you can reply in context."
      />
      <ListeningForm />
    </div>
  );
}
