import { createFileRoute, Outlet } from '@tanstack/react-router';

import { PageHeader } from '@/components/layout';
import { SettingsNav } from '@/components/settings/settings-nav';
import SidebarLayout from '@/components/sidebar/layout';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <>
      <SidebarLayout.Header>
        <PageHeader breadcrumbs={[{ label: 'Settings' }]} />
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-8">
          <aside className="md:sticky md:top-0 md:w-64 md:shrink-0 md:self-start">
            <h2 className="px-3 text-lg font-semibold tracking-tight text-foreground">Settings</h2>
            <div className="mt-3">
              <SettingsNav />
            </div>
          </aside>
          <div className="@container min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </SidebarLayout.Content>
    </>
  );
}
