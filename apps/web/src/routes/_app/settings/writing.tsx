import { createFileRoute } from '@tanstack/react-router';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

import WritingForm from './-writing-form';

export const Route = createFileRoute('/_app/settings/writing')({
  head: () => ({
    meta: [{ title: pageTitle('Writing help') }],
  }),
  component: WritingSettingsPage,
});

function WritingSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Writing help"
        description="Suggests full sentences as you type, in your own way of speaking."
      />
      <WritingForm />
    </div>
  );
}
