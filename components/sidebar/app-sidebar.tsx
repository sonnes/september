'use client';

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import {
  Home,
  LifeBuoy,
  MessageCircle,
  MessageSquare,
  Mic,
  PenTool,
  Send,
  Settings2,
} from 'lucide-react';

import { NavMain } from '@/components/sidebar/nav-main';
import { NavProjects } from '@/components/sidebar/nav-projects';
import { NavSecondary } from '@/components/sidebar/nav-secondary';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

type AppSidebarProps = React.ComponentProps<typeof Sidebar>;

const getNavigationData = () => ({
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Home,
    },
    {
      title: 'Talk',
      url: '/talk',
      icon: MessageSquare,
    },
    {
      title: 'Chats',
      url: '/chats',
      icon: MessageCircle,
    },
    {
      title: 'Write',
      url: '/write',
      icon: PenTool,
    },
    {
      title: 'Clone',
      url: '/clone',
      icon: Mic,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
      isExpanded: true,
      items: [
        {
          title: 'Providers',
          url: '/settings/providers',
        },
        {
          title: 'Suggestions',
          url: '/settings/suggestions',
        },
        {
          title: 'Transcription',
          url: '/settings/transcription',
        },
        {
          title: 'Speech',
          url: '/settings/speech',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'Support',
      url: '/support',
      icon: LifeBuoy,
    },
    {
      title: 'Feedback',
      url: '/feedback',
      icon: Send,
    },
  ],
  projects: [],
});

export function AppSidebar(props: AppSidebarProps) {
  const data = getNavigationData();

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <Image src="/logo.png" alt="September" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-xl font-bold leading-tight">
                  <span className="truncate">september</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.projects.length > 0 && <NavProjects projects={data.projects} />}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>{/* <NavUser /> */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
