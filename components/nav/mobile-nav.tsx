'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

import { type ThemeColor, themes } from '@/lib/theme';
import { cn } from '@/lib/utils';

type NavigationItem = {
  name: string;
  href: string;
  description?: string;
};

type MobileNavProps = {
  items: NavigationItem[];
  current?: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  color?: ThemeColor;
};

export default function MobileNav({ items, current, user, color = 'indigo' }: MobileNavProps) {
  const theme = themes[color];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile navigation bar */}
      <nav className="md:hidden mx-auto flex max-w-7xl items-center justify-between py-4 mb-2 border-b border-white/10">
        <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
          <span className="sr-only">September</span>
          <Image src="/logo.png" alt="September" width={32} height={32} />
          <span className="text-white font-semibold text-xl tracking-tight">september</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
        >
          <span className="sr-only">Open main menu</span>
          <Bars3Icon aria-hidden="true" className="size-6" />
        </button>
      </nav>

      {/* Mobile menu */}
      <Dialog open={isOpen} onClose={setIsOpen} className="lg:hidden">
        <div className="fixed inset-0 z-10" />
        <DialogPanel className="fixed inset-y-0 right-0 z-10 flex w-full flex-col justify-between overflow-y-auto bg-white sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
                <span className="sr-only">September</span>
                <Image src="/logo.png" alt="September" width={32} height={32} />
                <span className="font-semibold text-xl tracking-tight text-gray-900">
                  september
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {items.map(item => {
                    const isActive = current === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          '-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold transition-colors',
                          isActive ? 'bg-gray-50 text-gray-900' : 'text-gray-900 hover:bg-gray-50'
                        )}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
                <div className="py-6">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={user.name || 'User'}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {user.name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="space-y-2 pt-3">
                        <Link
                          href="/account"
                          onClick={() => setIsOpen(false)}
                          className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                        >
                          Account
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setIsOpen(false)}
                          className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                        >
                          Settings
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      Log in
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
}
