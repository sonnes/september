'use client';

import { ClientProviders } from '@/components/context/client-providers';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import SidebarLayout from '@/components/sidebar/layout';

import AISettingsForm from './form';

export default function AISettingsPage() {
  return (
    <ClientProviders>
      <SidebarLayout>
        <SidebarLayout.Header>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>AI Providers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </SidebarLayout.Header>
        <SidebarLayout.Content>
          <AISettingsForm />
        </SidebarLayout.Content>
      </SidebarLayout>
    </ClientProviders>
  );
}
