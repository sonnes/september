'use client';

import * as React from 'react';

import { Link } from '@tanstack/react-router';
import {
  CircleHelp,
  FileText,
  Home,
  LifeBuoy,
  MessageSquare,
  Mic,
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
} from '@/packages/ui/components/sidebar';

type AppSidebarProps = React.ComponentProps<typeof Sidebar>;

export const getNavigationData = () => ({
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
      title: 'Notes',
      url: '/notes',
      icon: FileText,
    },
    {
      title: 'Clone',
      url: '/clone',
      icon: Mic,
    },
    {
      title: 'Help',
      url: '/help',
      icon: CircleHelp,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
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
            <SidebarMenuButton
              size="lg"
              asChild
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg group-data-[collapsible=icon]:size-6">
                  <img
                    src="/logo.png"
                    alt="September"
                    className="size-full object-contain"
                    width={32}
                    height={32}
                    loading="lazy"
                  />
                </div>
                <div className="grid flex-1 text-left text-xl font-bold leading-tight group-data-[collapsible=icon]:hidden">
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
