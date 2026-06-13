import { createFileRoute } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { DashboardStats } from '@/packages/analytics';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

import { pageTitle } from '@/lib/seo';

export const Route = createFileRoute('/_app/dashboard')({
  head: () => ({
    meta: [
      { title: pageTitle('Dashboard') },
      { name: 'description', content: 'View your September communication activity and stats.' },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAccount();

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Dashboard' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="wide">
          <PageTitle title="Dashboard" description="Your September activity at a glance." />
          {!loading && <DashboardStats userId={user?.id} />}
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
