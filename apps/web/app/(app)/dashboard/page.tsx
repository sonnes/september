'use client';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@september/ui/components/breadcrumb';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import { useAccountContext } from '@september/account';
import { DashboardStats } from '@september/analytics';

export default function DashboardPage() {
  const { loading } = useAccountContext();

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
          </div>

          {!loading && <DashboardStats />}
        </div>
      </SidebarLayout.Content>
    </>
  );
}
