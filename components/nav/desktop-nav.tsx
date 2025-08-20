import Image from 'next/image';
import Link from 'next/link';

import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

import { type ThemeColor } from '@/lib/theme';
import { cn } from '@/lib/utils';

type NavigationItem = {
  name: string;
  href: string;
  description?: string;
};

type DesktopNavProps = {
  items: NavigationItem[];
  current?: string;
  user?: {
    email?: string;
    avatar?: string;
  } | null;
  color?: ThemeColor;
};

export default function DesktopNav({ items, current, user }: DesktopNavProps) {

  return (
    <nav
      aria-label="Global"
      className="hidden md:flex mx-auto max-w-7xl items-center justify-between py-4 mb-6 border-b border-white/10"
    >
      <div className="flex lg:flex-1">
        <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
          <span className="sr-only">September</span>
          <Image src="/logo.png" alt="September" width={32} height={32} />
          <span className="text-white font-semibold text-xl tracking-tight">september</span>
        </Link>
      </div>

      <PopoverGroup className="hidden lg:flex lg:gap-x-12">
        {items.map(item => {
          const isActive = current === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm/6 font-semibold transition-colors',
                isActive ? 'text-white' : 'text-white/80 hover:text-white'
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
              <div className="w-56 shrink rounded-xl bg-white p-4 text-sm/6 font-semibold text-gray-900 shadow-lg ring-1 ring-gray-900/5">
                <Link href="/account" className="block p-2 hover:text-indigo-600">
                  Account
                </Link>
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
