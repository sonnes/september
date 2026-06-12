'use client';

import { useAccount } from '@september/account';
import { DashboardStats } from '@september/analytics';

import { PageHeader, PageShell, PageTitle } from '@/components/layout';
import SidebarLayout from '@/components/sidebar/layout';

export default function DashboardPage() {
  const { loading } = useAccount();

  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Dashboard' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <PageShell width="wide">
          <PageTitle title="Dashboard" description="Your September activity at a glance." />
          {!loading && <DashboardStats />}
        </PageShell>
      </SidebarLayout.Content>
    </>
  );
}
