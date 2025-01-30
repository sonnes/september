"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useState } from "react";
import { Button } from "@/components/catalyst/button";
import { Profile } from "@/components/profile";
import { SignUpDialog } from "@/components/sign-up-dialog";
import { signOut, useSession } from "next-auth/react";

const navigation = [
  { name: "Talk", href: "/talk" },
  { name: "Abacus", href: "/abacus" },
];

const userNavigation = [
  { name: "Your Profile", href: "#" },
  { name: "Settings", href: "#" },
  {
    name: "Sign out",
    href: "#",
    onClick: () => signOut(),
  },
];

const user = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};

const colorsMap = {
  indigo: {
    border: "border-indigo-300",
    bg: "bg-indigo-500",
    borderLg: "border-indigo-400",
    bgHover: "hover:bg-indigo-500/75",
    bgActive: "bg-indigo-600",
    text: "text-indigo-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-indigo-600",
    textLight: "text-indigo-300",
  },
  blue: {
    border: "border-blue-300",
    bg: "bg-blue-500",
    borderLg: "border-blue-400",
    bgHover: "hover:bg-blue-500/75",
    bgActive: "bg-blue-600",
    text: "text-blue-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-blue-600",
    textLight: "text-blue-300",
  },
  red: {
    border: "border-red-300",
    bg: "bg-red-500",
    borderLg: "border-red-400",
    bgHover: "hover:bg-red-500/75",
    bgActive: "bg-red-600",
    text: "text-red-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-red-600",
    textLight: "text-red-300",
  },
  amber: {
    border: "border-amber-300",
    bg: "bg-amber-500",
    borderLg: "border-amber-400",
    bgHover: "hover:bg-amber-500/75",
    bgActive: "bg-amber-600",
    text: "text-amber-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-amber-600",
    textLight: "text-amber-300",
  },
} as const;

export function TopNavigation({ color }: { color: keyof typeof colorsMap }) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const pathname = usePathname();
  const colors = colorsMap[color];
  const { data: session } = useSession();

  return (
    <>
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
      <SignUpDialog open={showSignUp} onClose={() => setShowSignUp(false)} />
      <Disclosure
        as="nav"
        className={clsx("border-b lg:border-none", colors.border, colors.bg)}
      >
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
              <div
                className={clsx(
                  "relative flex h-16 items-center justify-between lg:border-b",
                  colors.borderLg
                )}
              >
                <div className="flex items-center px-2 lg:px-0">
                  <div className="shrink-0">
                    <Link href="/" className="flex items-center gap-2">
                      <Image
                        alt="September"
                        src={`/logo.png`}
                        width={32}
                        height={32}
                      />
                      <span className="text-white font-semibold text-lg tracking-tight">
                        septemberfox
                      </span>
                    </Link>
                  </div>
                  <div className="hidden lg:ml-10 lg:block">
                    <div className="flex space-x-4">
                      {navigation.map((item) => {
                        const isCurrent = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            aria-current={isCurrent ? "page" : undefined}
                            className={clsx(
                              "rounded-md px-3 py-2 text-sm font-medium",
                              isCurrent
                                ? clsx(colors.bgActive, "text-white")
                                : clsx("text-white", colors.bgHover)
                            )}
                          >
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex lg:hidden">
                  <DisclosureButton
                    className={clsx(
                      "group relative inline-flex items-center justify-center rounded-md p-2",
                      colors.bg,
                      colors.text,
                      colors.textHover,
                      "focus:outline-hidden focus:ring-2 focus:ring-white focus:ring-offset-2",
                      colors.ringOffset
                    )}
                  >
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open main menu</span>
                    <Bars3Icon
                      aria-hidden="true"
                      className="block size-6 group-data-open:hidden"
                    />
                    <XMarkIcon
                      aria-hidden="true"
                      className="hidden size-6 group-data-open:block"
                    />
                  </DisclosureButton>
                </div>
                <div className="hidden lg:ml-4 lg:block">
                  <div className="flex items-center">
                    {session?.user ? (
                      <Profile user={session.user} />
                    ) : (
                      <div className="flex gap-4 items-center">
                        <Link
                          className="text-sm font-medium text-white"
                          href="javascript:void(0)"
                          onClick={() => setShowSignIn(true)}
                        >
                          Sign in
                        </Link>
                        <Button
                          color="white"
                          onClick={() => setShowSignUp(true)}
                        >
                          Sign up
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DisclosurePanel className="lg:hidden">
              <div className="space-y-1 px-2 pb-3 pt-2">
                {navigation.map((item) => {
                  const isCurrent = pathname === item.href;
                  return (
                    <DisclosureButton
                      key={item.name}
                      as={Link}
                      href={item.href}
                      aria-current={isCurrent ? "page" : undefined}
                      className={clsx(
                        "block rounded-md px-3 py-2 text-base font-medium",
                        isCurrent
                          ? clsx(colors.bgActive, "text-white")
                          : clsx("text-white", colors.bgHover)
                      )}
                    >
                      {item.name}
                    </DisclosureButton>
                  );
                })}
              </div>
              <div className={clsx(`border-t pb-3 pt-4`, colors.borderLg)}>
                <div className="flex items-center px-5">
                  <div className="shrink-0">
                    <img
                      alt=""
                      src={user.imageUrl}
                      className="size-10 rounded-full"
                    />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-white">
                      {user.name}
                    </div>
                    <div
                      className={clsx("text-sm font-medium", colors.textLight)}
                    >
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 px-2">
                  {userNavigation.map((item) => (
                    <DisclosureButton
                      key={item.name}
                      as={Link}
                      href={item.href}
                      className={clsx(
                        "block rounded-md px-3 py-2 text-base font-medium text-white",
                        colors.bgHover
                      )}
                    >
                      {item.name}
                    </DisclosureButton>
                  ))}
                </div>
              </div>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </>
  );
}
