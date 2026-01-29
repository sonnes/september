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

import { SpeechProvider } from '@september/speech';

import SettingsForm from './form';

export default function SettingsPage() {
  return (
    <>
      <SidebarLayout.Header>
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarLayout.Header>
      <SidebarLayout.Content>
        <SpeechProvider>
          <SettingsForm />
        </SpeechProvider>
      </SidebarLayout.Content>
    </>
  );
}
