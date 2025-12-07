'use client';

import * as React from 'react';

import Image from 'next/image';

import { LifeBuoy, MessageSquare, PenTool, Send, Settings2, Volume2 } from 'lucide-react';

import { NavMain } from '@/components/sidebar/nav-main';
import { NavProjects } from '@/components/sidebar/nav-projects';
import { NavSecondary } from '@/components/sidebar/nav-secondary';
import { NavUser } from '@/components/sidebar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: {
    email?: string;
    avatar?: string;
  } | null;
};

const getNavigationData = (user?: { email?: string; avatar?: string } | null) => ({
  user: user
    ? {
        name: user.email?.split('@')[0] || 'User',
        email: user.email,
        avatar: user.avatar,
      }
    : {
        name: 'Guest',
        email: 'guest@september.app',
        avatar: '',
      },
  navMain: [
    {
      title: 'Talk',
      url: '/talk',
      icon: MessageSquare,
      isActive: false,
    },
    {
      title: 'Voices',
      url: '/voices',
      icon: Volume2,
      isActive: false,
    },
    {
      title: 'Write',
      url: '/write',
      icon: PenTool,
      isActive: false,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
      isActive: false,
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

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const data = getNavigationData(user);

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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
