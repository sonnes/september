'use client';

import { Link, useLocation } from '@tanstack/react-router';

import { KeyRound, Lightbulb, Mic, User, Volume2, type LucideIcon } from 'lucide-react';

import { cn } from '@/packages/shared';

type SettingsSection = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const SECTIONS: SettingsSection[] = [
  {
    title: 'Account',
    description: 'Your personal details and consent.',
    href: '/settings',
    icon: User,
  },
  {
    title: 'Providers',
    description: 'Connect the AI services that power September.',
    href: '/settings/providers',
    icon: KeyRound,
  },
  {
    title: 'Suggestions',
    description: 'Tune AI-powered typing suggestions.',
    href: '/settings/suggestions',
    icon: Lightbulb,
  },
  {
    title: 'Transcription',
    description: 'Configure speech-to-text.',
    href: '/settings/transcription',
    icon: Mic,
  },
  {
    title: 'Speech',
    description: 'Pick the voice that speaks for you.',
    href: '/settings/speech',
    icon: Volume2,
  },
];

export function SettingsNav() {
  const pathname = useLocation({ select: l => l.pathname });

  return (
    <nav className="flex flex-col gap-1">
      {SECTIONS.map(section => {
        const isActive =
          section.href === '/settings'
            ? pathname === '/settings'
            : pathname.startsWith(section.href);

        return (
          <Link
            key={section.href}
            to={section.href}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
              isActive ? 'bg-muted' : 'hover:bg-muted/60'
            )}
          >
            <section.icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-none text-foreground">
                {section.title}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {section.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
