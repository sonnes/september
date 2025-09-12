import Image from 'next/image';
import Link from 'next/link';

import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

import { cn } from '@/lib/utils';

type NavigationItem = {
  name: string;
  href: string;
  description?: string;
};

export type DesktopNavProps = {
  items?: NavigationItem[];
  current?: string;
  user?: {
    email?: string;
    avatar?: string;
  } | null;
  className?: string;
};

export default function DesktopNav({ items, current, user, className }: DesktopNavProps) {
  return (
    <nav
      aria-label="Global"
      className={cn(
        'hidden md:flex mx-auto max-w-7xl items-center justify-between py-2 mb-4 border-b border-white/10',
        className
      )}
    >
      <div className="flex lg:flex-1">
        <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
          <span className="sr-only">September</span>
          <Image src="/logo.png" alt="September" width={32} height={32} />
          <span className="text-white font-semibold text-xl tracking-tight">september</span>
        </Link>
      </div>

      <PopoverGroup className="hidden lg:flex lg:gap-x-6">
        {items?.map(item => {
          const isActive = current === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm/6 font-semibold transition-colors rounded-md px-3 py-2',
                isActive ? 'text-white bg-indigo-600' : 'text-white/80 hover:text-white'
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </PopoverGroup>

      <div className="hidden lg:flex lg:flex-1 lg:justify-end">
        {user ? (
          <Popover className="relative">
            <PopoverButton className="inline-flex items-center gap-x-1 text-sm/6 font-semibold text-white hover:text-white/80 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-white/70">{user.email}</p>
                </div>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.email || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-medium text-white">
                      {user.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronDownIcon aria-hidden="true" className="size-5" />
            </PopoverButton>

            <PopoverPanel
              transition
              className="absolute right-0 z-10 mt-5 flex w-screen max-w-min bg-transparent px-4 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div className="w-56 shrink rounded-xl bg-white p-4 text-sm/6 font-semibold text-zinc-900 shadow-lg ring-1 ring-zinc-900/5">
                <Link href="/settings" className="block p-2 hover:text-indigo-600">
                  Settings
                </Link>
              </div>
            </PopoverPanel>
          </Popover>
        ) : (
          <Link
            href="/login"
            className="text-sm/6 font-semibold text-white hover:text-white/80 transition-colors"
          >
            Log in <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
