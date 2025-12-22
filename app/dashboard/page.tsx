'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { useAccount } from '@/packages/account';
import SidebarLayout from '@/components/sidebar/layout';

import { DashboardSkeleton } from './loading-skeleton';

export default function DashboardPage() {
  const { user, loading } = useAccount();

  return (
    <SidebarLayout>
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
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.user_metadata?.full_name}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-sm font-medium text-muted-foreground">Total Messages</h3>
                <p className="mt-2 text-3xl font-bold">—</p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
                <p className="mt-2 text-3xl font-bold">—</p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-sm font-medium text-muted-foreground">Quick Stats</h3>
                <p className="mt-2 text-3xl font-bold">—</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout.Content>
    </SidebarLayout>
  );
}
