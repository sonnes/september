'use client';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccountContext } from '@/packages/account';
import { DashboardStats } from '@/packages/analytics';

export default function DashboardPage() {
  const { user, loading } = useAccountContext();

  return (
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            {user?.user_metadata?.full_name && (
              <p className="text-muted-foreground">
                Welcome back, {user.user_metadata.full_name}
              </p>
            )}
          </div>

          {!loading && <DashboardStats />}
        </div>
      </SidebarLayout.Content>
    </>
  );
}
