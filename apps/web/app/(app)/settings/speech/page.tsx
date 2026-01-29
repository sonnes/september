'use client';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@september/ui/components/breadcrumb';
import { Separator } from '@september/ui/components/separator';
import { SidebarTrigger } from '@september/ui/components/sidebar';

import { SpeechProvider } from '@september/speech';

import VoicesSettingsForm from './form';

export default function SpeechSettingsPage() {
  return (
    <>
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
              <BreadcrumbPage>Speech</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <SpeechProvider>
          <VoicesSettingsForm />
        </SpeechProvider>
      </SidebarLayout.Content>
    </>
  );
}
