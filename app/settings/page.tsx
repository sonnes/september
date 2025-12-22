import type { Metadata } from 'next';

import SidebarLayout from '@/components/sidebar/layout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { SpeechProvider } from '@/packages/speech';

import SettingsForm from './form';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your September communication assistant settings and preferences.',
};

export default async function SettingsPage() {
  return (
    <SidebarLayout>
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
    </SidebarLayout>
  );
}
