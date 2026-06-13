import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ClientProviders } from '@/components/context/client-providers';
import SidebarLayout from '@/components/sidebar/layout';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  return (
    <ClientProviders>
      <SidebarLayout>
        <Outlet />
      </SidebarLayout>
    </ClientProviders>
  );
}
