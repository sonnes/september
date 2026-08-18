'use client';

import * as React from 'react';

import { Link } from '@tanstack/react-router';
import { CircleHelp, Home, LifeBuoy, MessageSquare, Mic, Send, Settings2 } from 'lucide-react';

import { BrandMark, BrandWordmark } from '@/components/brand';
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
      title: 'Spaces',
      url: '/spaces',
      icon: MessageSquare,
    },
    {
      title: 'Voice',
      url: '/voice',
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
              <Link to="/" aria-label="September home">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg group-data-[collapsible=icon]:size-6">
                  <BrandMark size={32} className="size-full" loading="lazy" />
                </div>
                <div className="grid flex-1 text-left text-xl font-bold leading-tight group-data-[collapsible=icon]:hidden">
                  <BrandWordmark aria-hidden="true" tone="inverse" className="truncate text-xl" />
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
