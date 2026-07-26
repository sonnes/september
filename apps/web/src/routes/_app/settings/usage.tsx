import { createFileRoute } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { UsageReport } from '@/packages/usage';

import { PageTitle } from '@/components/layout';

import { pageTitle } from '@/lib/seo';

export const Route = createFileRoute('/_app/settings/usage')({
  head: () => ({
    meta: [
      { title: pageTitle('Usage') },
      {
        name: 'description',
        content: 'See what your connected services used, and what they cost.',
      },
    ],
  }),
  component: UsagePage,
});

function UsagePage() {
  const { user, loading } = useAccount();

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Usage"
        description="What each connected service used, and what it cost you."
      />
      {!loading && <UsageReport userId={user?.id} />}
    </div>
  );
}
