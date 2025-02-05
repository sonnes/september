'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Disclosure, DisclosureButton } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { type ThemeColor, themes } from '@/lib/theme';

import { AuthButtons } from './auth-buttons';
import { MobileMenu } from './mobile-menu';
import { NavigationLinks } from './navigation-links';

const navigation = [
  { name: 'Clone', href: '/clone' },
  { name: 'Talk', href: '/talk' },
  { name: 'Abacus', href: '/abacus' },
];

export function TopNavigation({ color }: { color: ThemeColor }) {
  const pathname = usePathname();
  const theme = themes[color];

  return (
    <Disclosure as="nav" className={clsx('border-b lg:border-none', theme.border, theme.bg)}>
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
            <div
              className={clsx(
                'relative flex h-16 items-center justify-between lg:border-b',
                theme.borderLg
              )}
            >
              <div className="flex items-center px-2 lg:px-0">
                <div className="shrink-0">
                  <Link href="/" className="flex items-center gap-2">
                    <Image alt="September" src={`/logo.png`} width={32} height={32} />
                    <span className="text-white font-semibold text-lg tracking-tight">
                      septemberfox
                    </span>
                  </Link>
                </div>
                <NavigationLinks items={navigation} currentPath={pathname} color={color} />
              </div>

              <div className="flex lg:hidden">
                <DisclosureButton
                  className={clsx(
                    'group relative inline-flex items-center justify-center rounded-md p-2',
                    theme.bg,
                    theme.text,
                    theme.textHover,
                    'focus:outline-hidden focus:ring-2 focus:ring-white focus:ring-offset-2',
                    theme.ringOffset
                  )}
                >
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
                  <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
                </DisclosureButton>
              </div>
              <div className="hidden lg:ml-4 lg:block">
                <div className="flex items-center">{<AuthButtons />}</div>
              </div>
            </div>
          </div>

          <MobileMenu navigation={navigation} currentPath={pathname} color={color} />
        </>
      )}
    </Disclosure>
  );
}
