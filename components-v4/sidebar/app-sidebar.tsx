'use client';

import * as React from 'react';

import Image from 'next/image';

import { Home, LifeBuoy, MessageSquare, PenTool, Send, Settings2, Volume2 } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { NavMain } from '@/components-v4/sidebar/nav-main';
import { NavProjects } from '@/components-v4/sidebar/nav-projects';
import { NavSecondary } from '@/components-v4/sidebar/nav-secondary';
import { NavUser } from '@/components-v4/sidebar/nav-user';
import { User } from '@/types/user';

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
      title: 'Voices',
      url: '/voices',
      icon: Volume2,
    },
    {
      title: 'Write',
      url: '/write',
      icon: PenTool,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '/settings',
        },
        {
          title: 'AI',
          url: '/settings/ai',
        },
        {
          title: 'Voices',
          url: '/settings/voices',
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
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-12 items-center justify-center rounded-lg overflow-hidden">
                  <Image src="/logo.png" alt="September" width={48} height={48} />
                </div>
                <div className="grid flex-1 text-left text-xl font-bold leading-tight">
                  <span className="truncate">september</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.projects.length > 0 && <NavProjects projects={data.projects} />}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
