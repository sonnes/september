'use client';

import { Link, useLocation } from '@tanstack/react-router';

import {
  Lightbulb,
  Mic,
  SlidersHorizontal,
  User,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/packages/shared';

type SettingsSection = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: 'Setup',
    description: 'How September runs, and its connections.',
    href: '/settings',
    icon: SlidersHorizontal,
  },
  {
    title: 'Voice',
    description: 'The voice that speaks for you.',
    href: '/settings/voice',
    icon: Volume2,
  },
  {
    title: 'Writing help',
    description: 'Sentence suggestions as you type.',
    href: '/settings/writing',
    icon: Lightbulb,
  },
  {
    title: 'Listening',
    description: 'Writes down what people say.',
    href: '/settings/listening',
    icon: Mic,
  },
  {
    title: 'Account',
    description: 'Your details, sync, and backup.',
    href: '/settings/account',
    icon: User,
  },
];

export function SettingsNav() {
  const pathname = useLocation({ select: l => l.pathname });

  return (
    // Below md the nav is a horizontal row of title-only pills so content stays
    // above the fold; the full icon + description list appears from md up.
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {SETTINGS_SECTIONS.map(section => {
        // Connection drill-ins are children of Setup, so Setup stays active there.
        const isActive =
          section.href === '/settings'
            ? pathname === '/settings' || pathname.startsWith('/settings/connections')
            : pathname.startsWith(section.href);

        return (
          <Link
            key={section.href}
            to={section.href}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 transition-colors md:items-start md:gap-3',
              isActive ? 'bg-muted' : 'hover:bg-muted/60'
            )}
          >
            <section.icon
              className={cn(
                'size-4 shrink-0 md:mt-0.5',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-none whitespace-nowrap text-foreground">
                {section.title}
              </span>
              <span className="hidden text-xs leading-snug text-muted-foreground md:block">
                {section.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
