'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { AvatarButton } from '@/components/catalyst/avatar';
import { Button } from '@/components/catalyst/button';
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  DropdownMenu,
} from '@/components/catalyst/dropdown';
import { useAuth } from '@/components/context/auth';
import { ThemeContext, useTheme } from '@/components/context/theme';
import { type ThemeColor, themes } from '@/lib/theme';

const links = [
  { name: 'Clone', href: '/app/clone' },
  { name: 'Talk', href: '/app/talk' },
];

const profileLinks = [
  { name: 'Account', href: '/app/account' },
  { name: 'Settings', href: '/app/settings' },
  { name: 'Logout', href: '/app/logout' },
];

type NavbarProps = {
  color?: ThemeColor;
};

export default function Navbar({ color = 'indigo' }: NavbarProps) {
  const { user } = useAuth();
  const theme = themes[color];

  return (
    <ThemeContext.Provider value={{ theme }}>
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
                    <Link href={user ? '/app' : '/'} className="flex items-center gap-2">
                      <Image alt="September" src={`/logo.png`} width={32} height={32} />
                      <span className="text-white font-semibold text-lg tracking-tight">
                        septemberfox
                      </span>
                    </Link>
                  </div>
                  <DesktopMenu />
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
                  <div className="flex items-center">
                    <ProfileDropdown />
                  </div>
                </div>
              </div>
            </div>

            <MobileMenu />
          </>
        )}
      </Disclosure>
    </ThemeContext.Provider>
  );
}

const MobileMenu = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <DisclosurePanel className="lg:hidden">
      <div className="space-y-1 px-2 pb-3 pt-2">
        {links.map(item => {
          const isCurrent = pathname === item.href;
          return (
            <DisclosureButton
              key={item.name}
              as={Link}
              href={item.href}
              aria-current={isCurrent ? 'page' : undefined}
              className={clsx(
                'block rounded-md px-3 py-2 text-base font-medium',
                isCurrent ? clsx(theme.bgActive, 'text-white') : clsx('text-white', theme.bgHover)
              )}
            >
              {item.name}
            </DisclosureButton>
          );
        })}
      </div>
      <div className={clsx(`border-t space-y-1 px-2 pb-3 pt-2`, theme.borderLg)}>
        <MobileProfile />
      </div>
    </DisclosurePanel>
  );
};

const MobileProfile = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  if (!user) {
    return <MobileAuthButtons />;
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="block rounded-md px-3 py-2 text-base font-medium text-white">
          Logged in as {user.email}
        </div>
        <DropdownDivider />
      </div>
      {profileLinks.map(item => (
        <DisclosureButton
          key={item.name}
          as={Link}
          href={item.href}
          className={clsx(
            'block rounded-md px-3 py-2 text-base font-medium',
            clsx('text-white', theme.bgHover)
          )}
        >
          {item.name}
        </DisclosureButton>
      ))}
    </>
  );
};

const MobileAuthButtons = () => {
  const { theme } = useTheme();
  return (
    <>
      <DisclosureButton
        as={Link}
        href={'/login'}
        className={clsx(
          'block rounded-md px-3 py-2 text-base font-medium',
          clsx('text-white', theme.bgHover)
        )}
      >
        Login
      </DisclosureButton>
      <DisclosureButton
        as={Link}
        href={'/signup'}
        className={clsx(
          'block rounded-md px-3 py-2 text-base font-medium',
          clsx('text-white', theme.bgHover)
        )}
      >
        Sign Up
      </DisclosureButton>
    </>
  );
};
const DesktopMenu = () => {
  const { theme } = useTheme();
  const pathname = usePathname();

  return (
    <div className="hidden lg:ml-10 lg:block">
      <div className="flex space-x-4">
        {links.map(item => {
          const isCurrent = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isCurrent ? 'page' : undefined}
              className={clsx(
                'rounded-md px-3 py-2 text-sm font-medium',
                isCurrent ? clsx(theme.bgActive, 'text-white') : clsx('text-white', theme.bgHover)
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

function AuthButtons() {
  return (
    <div className="flex gap-4 items-center">
      <Link className="text-sm font-medium text-white" href="/login">
        Login
      </Link>
      <Button color="white" href="/signup">
        Sign Up
      </Button>
    </div>
  );
}

function ProfileDropdown() {
  const { user } = useAuth();

  if (!user) {
    return <AuthButtons />;
  }

  return (
    <Dropdown>
      <DropdownButton
        as={AvatarButton}
        src={'https://github.com/shadcn.png'}
        className="w-10 h-10"
      />
      <DropdownMenu>
        <DropdownHeader>
          <div className="pr-6">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Signed in as Tom Cook</div>
            <div className="text-sm/7 font-semibold text-zinc-800 dark:text-white">
              {user.email}
            </div>
          </div>
        </DropdownHeader>
        <DropdownDivider />
        {profileLinks.map(item => (
          <DropdownItem key={item.name} href={item.href}>
            {item.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
